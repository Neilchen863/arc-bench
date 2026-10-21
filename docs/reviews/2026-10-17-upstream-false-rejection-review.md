# 最新上游误拒候选核对

核对日期：2026-10-17。重新 fetch 后 origin/main 为 `9f1bc06a3b0d3a423b2c039eca8c96004e3854f5`。

## 结论及证据边界

旧版固定 `/login` URL 的问题已消失；不能据此推断新版没有误拒风险。Claude 提出的七个方向基本有源码依据，但不能称为七个已在完整应用上确认的误拒案例。其中一项是默认配置与等待预算不一致，六项是局部 HTML 可以复现的定位或断言限制。第七项的原始 HTML 举例违反全局纯数字契约，需要更换。

本次独立检查所列需求及测试，使用 Playwright 1.61.1、Chromium 149.0.7827.55 运行 12 个最小 HTML 探针。没有运行真实应用，没有确认任何完整软件满足全部需求，没有重做六个应用全部需求的逐行审计，也不背书原回答对扫描覆盖率的描述。

可复现脚本：[check.cjs](2026-10-17-false-rejection-evidence/check.cjs)；结果：[results.json](2026-10-17-false-rejection-evidence/results.json)。脚本仅 setContent，不连接应用。trainIds 和 flightOrder 复现相关核心表达式，不是运行完整上游 spec。

## 七项逐项判定

以下路径均相对于仓库根目录，并指向上述固定上游版本；本地工作区文件不一定等于该版本，可用 `git show 9f1bc06a:<path>` 查看。

| 项目 | 判定 | 核对证据与限制 |
|---|---|---|
| 1. Keep 通知自动消失 | 默认配置不一致成立 | `arc-bench/keep/requirements/requirements.yaml:261` 给出实现自选时长及 60 秒等待预算；`tests/REQ-2.4.spec.ts:39` 等待 60 秒。README:111–116、setup-playwright.sh:75、setup-playwright.ps1:95 则设置整个测试 10 秒。未发现 Keep 延长该测试的覆盖设置。通知如停留 12 秒，便可能满足 60 秒预算而超出默认整项测试预算。README 明确允许调整配置，因此这是默认配置下的条件性误拒，不是所有运行必败；本次没有实际运行计时测试。 |
| 2. Keep 多行内容 | 局部反例成立 | REQ-2.2 创建多行内容，经 helpers.ts 的 expectNote 使用 getByText(content, exact=true)。pre-wrap 文本匹配 1 个；无额外文本空白的 `<br>` 和相邻 `<p>` 匹配 0 个。但 `<br>` 后带换行文本则匹配 1 个。因此不能说所有 br/p/div 渲染都会失败。问题是可见换行不一定对应定位器所依赖的文本空白。 |
| 3. Keep 叠加通知 | 条件性反例成立 | helpers.ts 的 deleteNote/archiveNote 对精确命名 status 作单元素可见性断言。REQ-2.5 Empty Trash 连删两条、REQ-2.6 Unarchive 连归档两条。需求未要求替换旧通知；两条同名通知同时存在时，独立探针确实 strict mode violation。若前一条已消失则不触发。不需要依赖任何 toast 库的默认行为来论证。 |
| 4. 12306 历史订单行 | 局部反例成立 | helpers.ts:11 以整段精确文字定位行。REQ-5.7.2/5.7.3（YAML:2680 起）要求 Train Information 等列及 G1001 订单，但没有要求车次独占一个文本元素。复现：车次与站名直接同格、或 br 分隔均找不到行；strong 单独包裹车次则找到。搜索结果的独立可识别车次要求不能自动扩大到订单表。退款历史查询也使用此类行定位。 |
| 5. 12306 行头车次 | 局部反例成立 | helpers.ts:79 起 trainIds 仅读取 cell。`th scope=row` 的 G1001 不在返回单元格中，核心逻辑得到零个车次并进入抛错条件；改为 td 则得到 G1001。需求要求独立可识别可见车次，没有指定必须使用 td。此问题影响调用该 helper 的排序/筛选检查。 |
| 6. ctrip 嵌套列表 | 局部反例成立 | YAML:1086、1234 要求航班 listitem 命名 Flight <number>；REQ-2.4.spec.ts 对 Flight list 的全部后代 listitem 计数，helpers.ts:83 起 flightOrder 遍历这些元素。三个航班中的经停子列表含两个 li 时，共计 5 个，其中 2 个没有 Flight 标识。需求未明确禁止嵌套列表。业务记录按 Record 前缀过滤，而这里没有对应过滤。 |
| 7. Stack Overflow Viewed | 额外前缀限制成立，但原例需改 | REQ-3.2.spec.ts:10 要求 /^Viewed/；YAML:900 要求 View count 命名 status，数值至少 42，没有规定 Viewed 前缀。但 YAML:466、484 的全局契约还要求 status metrics expose plain numeric text，所以把 `42 views` 全部放进 status 不合规。改为 `Views: <span role="status" aria-label="View count">42</span>` 后，status 纯数字要求及 helpers.ts:121 的整数解析均可满足，而 Viewed 仍匹配 0 个。这是更干净的局部反例。 |

## 其他说法的修正

- **Keep REQ-1.1 的 current=true 不是额外要求。** 原回答只读了 description；同一需求的 scenario THEN（YAML:117）明确写 Notes reports current=true。不能只凭 aria-current=page 在语义上合理就认定是误拒。
- **未命名 status/alert 的冲突需要定位到具体调用。** 12306 REQ-2.2.2:9、REQ-5.5:13 确实未过滤 status；ctrip REQ-6.7/6.8/6.9、REQ-3.12、REQ-1.13 有全页 alert 检查。但 ctrip helpers.ts:31 的 alertText 按内容过滤，第二条不匹配内容的 alert 不必然干扰它。不能将“出现第二条就冲突”推广到所有 alert 检查。
- **成功/库存提示的正则限制确实存在。** Stack Overflow REQ-2.4:16 使用 success|saved|updated；PrestaShop REQ-3.2:28 使用库存相关正则。需求只要求对应语义反馈。这是措辞限制候选，未在本次增加完整应用验证。
- 整页精确文字的重复匹配风险有合理机制依据，但需要两个元素都进入具体定位器结果；本次不将其计为额外已验证应用案例。
- Keep aria-labelledby 与嵌套高亮的候选若破坏“名字等于可见标题”的契约，就不能直接作为合规实现误拒证据。
- 长流程可能超时只能保留为待测风险；没有真实运行时间，不能认定某个长流程已误拒。
- 本次不核实 sonner/react-hot-toast 的默认设置；该旁证不是通知反例成立的必要条件。

## 对汇报的建议表述

> 旧版固定登录 URL 的误拒点在新版已经移除。但最新上游仍存在需求未规定的文本结构、元素角色和措辞约束，以及默认测试时限与需求等待预算不一致的问题。我们通过最小 HTML 复现了六类局部匹配限制；这些证据支持新版仍存在误拒风险，但尚未证明七个完整合规应用被 benchmark 拒绝。

若要与历史完整状态审计放在同一证据等级，需要构造满足相关契约的保义变体，在固定上游及明确配置下运行完整目标 spec；同时通过独立需求检查确认目标行为保持不变。报告应分别标注“源码分析”“局部复现”“完整应用复现”，避免混算数量。
