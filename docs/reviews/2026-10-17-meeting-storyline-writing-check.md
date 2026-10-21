# 新汇报稿的结构与证据自检

日期：2026-10-17。正文：[从验收遗漏到需求契约的初步探索](../arc-acceptance-research-meeting-report-2026-10-17.md)。本文件为写作附录，不是新增实验报告。

## 写作提纲

- §1–2：提出验收有效性问题，以 Close 的真实开发遗漏建立动机。
- §3：扩展到开发轨迹，同时区分 F1 争议、F2 人工测试和 F3 实验者强化规格。
- §4–5：用受控违反和合法改写分别检查漏检与误拒，限定历史版本。
- §6：报告反馈干预的作用与限制，加入已有 Close 不提供目标失败信号的修复诊断。
- §7–9：从失败机制引出契约假设，比较 G0/G1/G2，并以实际收益与失败分析约束结论。
- §10–12：用事后分析和上游变化收窄下一步问题，说明证据范围与新的比较设计。

## 段落角色与反向提纲

P 表示节内正文段落，表格和编号结论不单独编号；独立的箭头关系计为一段。角色采用 opening（引入）、challenge（问题）、method（设计）、advantage（预期价值）、evidence（证据）、limitation（边界）。advantage 仅表示方法动机，不表示已经证明的优势。

| 节 | 段落角色与作用 | 对主线的贡献 |
| --- | --- | --- |
| §1 | P1 opening：两层验收；P2 challenge：需求必须具体化；P3 challenge：遗漏与误拒；P4 opening：研究问题与路径 | 从开发流程过渡到验收问题 |
| §2 | P1 evidence：保存义务；P2 evidence：冻结实现；P3 evidence：遮罩测试；P4 evidence：两次继续；P5 evidence：事实链；P6 limitation：区分开发测试与 benchmark；P7 limitation：单例范围 | 用真实反例建立动机，不将单例推广为发生率 |
| §3 | P1 method：轨迹对比；P2 limitation：F1 争议；P3 evidence/limitation：F2 缺陷与测试来源；P4 evidence/limitation：F3 规格来源；P5 challenge：检查需求依据；P6 method：引出受控实验 | 在扩展证据时交代不同案例的身份 |
| §4 | P1 method：受控破坏；P2 evidence：严格主分析；P3 opening：两类机制；P4 evidence：未显现；P5 evidence：断言不足；P6 limitation：人工变异与版本范围 | 解释漏检如何产生，而非只列数字 |
| §5 | P1 method：保义改写；P2 evidence：路由案例；P3 limitation：目标范围与竞态；P4 challenge：双向验收；P5 opening：引出修复作用 | 说明更多断言不一定更好 |
| §6 | P1 method：三组干预；P2 evidence/limitation：修改与修复区别；P3 method：联合口径；P4 evidence/limitation：保护集；P5 limitation：C1 执行限制；P6 evidence/limitation：Close 配置诊断；P7 opening：引出自动检查生成 | 将人工反馈价值与自动方法成绩分开 |
| §7 | P1 challenge：归纳失败；P2 method：契约；P3 method：映射链；P4 advantage：对象和测试数据约束；P5 limitation：来源约束；P6 method：需要比较简单方法 | 明确契约是待验证假设 |
| §8 | P1 method：三组；P2 method：共享执行通路；P3 method：样本；P4 method：评价；P5 limitation：分母与有效性；P6 evidence：差值及胜负；P7 evidence/limitation：门槛未过 | 让方法结论由主分析决定 |
| §9 | P1 challenge：可执行性；P2 evidence/limitation：P 标签；P3 evidence：契约与断言偏离；P4 challenge：同名对象机制；P5 limitation：待解问题 | 解释收益有限并回扣开场机制 |
| §10 | P1 evidence：事后结果；P2 limitation：定义及提醒混杂；P3 evidence：上游修改；P4 limitation：七变异静态预测；P5 challenge：新版风险；P6 opening：明确输入下的忠实转换 | 接纳上游改进，更新后续问题 |
| §11 | P1 limitation：证据范围；P2 limitation：边界表；P3 evidence/limitation：用量与账单；P4 limitation：三个层次的结论 | 保持事实、配置结果与推广结论的区别 |
| §12 | P1 evidence：三个有依据结论；P2 method：下一轮对照；P3 method/limitation：新留出与冻结规格；P4 opening：讨论问题 | 回答当前能说什么与下一步如何验证 |

正文没有保留“旧稿需要删除／替换”的编辑指令；F3 限制在首次出现及结果解释处直接交代，上游变化在主实验后集中讨论。

## 主要结论—证据映射

| Claim | Evidence | Status |
| --- | --- | --- |
| 开发测试会遗漏需求入口，Close 给出具体反例 | `p1/start-manifest.json`、`p1/results.jsonl`；核对报告中的冻结实现依据 | supported，限定该轨迹 |
| F2 的发布环境功能失败不同于模拟调用成功 | 历史审计及阶段 A 收尾 | supported，测试人工提供，不归因于自然测试生成 |
| F3 不可直接称为原始上游的确定缺陷 | `1aec3512` 的需求 diff；`3b263a3c` 的 NoteGrid；源码摘录 | supported，明确实验者强化规格 |
| 历史严格主比较为 8 检出、7 存活、1 非目标失败 | 历史审计及保存快照 | supported，历史计数，不当总体错误率 |
| 合法路由改写被固定 URL 拒绝 | 历史 U1 保义结果与旧 helper；上游核对 | supported，旧版目标义务范围 |
| F2 目标 2/2、保守联合 1/2；F3 强化规格检查 2/2 | 阶段 A 收尾表与翻转裁定 | supported，保留两者不同证据身份 |
| 旧 C1 不能证明补测提示无效 | 阶段 A 的工具链审计 | supported，限定原执行配置 |
| Close step1b 目标 2/4、联合 1/4 | 四份 record.json、served-model 用量汇总与 run_mc.py | supported，不归因于单一模型或自然生成复现 |
| G2 的主检出仅比 G1 多 1/24，门槛未过 | holdout-report.json 的 36 条会话及 gate | supported，本次再次核对 4/6/7、7/11/12、5/4/9 |
| 契约结构本身带来已证明的额外收益 | 当前没有分离额外提醒的消融 | needs evidence，正文不作此断言 |
| P 拒绝为 15 适配＋1 语义，38 未运行 | 已有逐条 P 标签及计数 | supported 作为保存标签计数，不是独立重新裁定 |
| 新版对七个历史存活变异为四个预期检出、三个存活风险 | 固定上游源码、七变异定义和完整核对表 | supported 作为静态预测；新版实际结果 needs evidence |
| 新版颜色和等待预算存在具体风险 | visual.ts、REQ-2.7、REQ-2.4、README、setup 脚本 | supported 作为代码诊断；实际漏检／误拒次数 needs evidence |
| 319 请求全部记录 qwen3-coder-next 与 NUS SoCLaaS host | 66 份日志的已有汇总 | supported 作为日志字段；实际账单未核验 |

相对路径和主要材料入口集中在正文附录 B；上游源码分析统一使用固定 SHA，不把 10 月 16 日核对写成 10 月 17 日再次获取的最新版。

## 五维自检及处理

| 维度 | 问题 | 回答／已落实的处理 |
| --- | --- | --- |
| 贡献 | 是否把常见测试遗漏包装成已成功的新方法？ | 没有。定位为探索过程，报告具体机制和收益边界，不主张新颖性或普遍优越性 |
| 写作清晰 | 是否保持原 storyline，并让每一步有承接？ | 保留十二节顺序；每部分以当前证据不能回答的问题引出下一步；技术核对细节留在附录 |
| 实验强度 | 是否充分报告主结果弱、样本少和配置混杂？ | 写明 G2 仅多 1/24、2 胜 3 平 1 负、门槛未过；强模型预算与回退调用单列限制 |
| 评价完整性 | 是否把部分新版源码变化当成整体修复？ | 七变异全覆盖，标明预测与未重跑；不报告新版实测成功率；F3 与 H4 等新版重裁问题由核对报告支撑 |
| 方法设计 | 是否把写出契约当成正确验证？ | 用 Draft saved 和对象作用域失败直接否定此推断；下一轮要求公平提醒与新的留出需求 |

## 最终检查

- 清晰度：正文自含各实验的问题、设置、主要结果与限制。
- 衔接：Close → 轨迹 → 受控双向审计 → 反馈 → 自动契约 → 结果及下一步。
- 术语：开发测试、benchmark、目标通过、联合成功、静态预测分别使用，不混称“修复率”。
- 无依据结论：没有宣称 F3 是原始上游缺陷、强模型证明自然生成复现、阶段 B 已成功、新版已实测或账单已核验。
- 缺失证据：新版运行验证、独立裁定、契约与提醒的消融仍保留为待做工作。
- 产物范围：新建正文与本自检文件，不改原汇报和原始实验记录。
