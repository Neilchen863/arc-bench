# Fork 测试迁移核对

核对日期：2026年10月21日。对象：Neilchen863/arc-bench 的 main 提交 ae6d8e80cb8775e5ecb5903e038ed31bcdcd2efb，父提交 c583968dcde891cf58ad3b54a03c757affc44c54。

## 结论

D 的运行时代码已经完整迁入。15 个支持文件与本地 benchmark-fidelity-v2 的 D/common 来源逐字节一致；三个 spec 的差异仅为新增 120 秒单项时限和将内部场景 ID 改为需求中的可读标题。没有发现驱动、观察器、判据、输入或日志模块漏搬。

提交范围较窄：替换三条需求的六个场景，其余测试仍保留旧实现。若目标是发布 D 的首批可运行测试，这一步已完成；若目标是完整提交 10 月 17 日以来的测试改进及验证依据，还需要补充契约、自测和验证说明。此前审查中的多数问题仍在原 helpers 或其他应用中，不能把这次提交解释为全 bench 已经完成修复。

核对过程仅在临时克隆中生成配置和执行检查，没有修改或推送 fork，也没有改动本地实验方法与原始结果。

## 已迁入的内容

| 内容 | 结果 |
| --- | --- |
| Keep REQ-2.2 与 REQ-4.1 | 已替换，四个场景 |
| BookStack REQ-6.4 | 已替换，两个场景 |
| 两个应用的 capabilities、drivers、observe、oracle | 已迁入，来源一致 |
| 共用 ledger、输入、失败证据与编辑状态观察 | 已按独立应用测试包复制，无缺失导入 |
| 单项时限 | 三个 spec 均显式使用 120 秒，不受 setup 默认 10 秒限制 |

总 diff 为 18 个文件、1321 行新增、71 行删除。其中 15 个是新增支持文件，3 个是修改的 spec。drivers.ts 的 224 行在两个应用各复制一份，ledger 和 evidence 也有包内副本，因此新增行数包含重复代码。

全库能发现 337 个 spec 文件、514 个 case。本次替换 3 个 spec、6 个 case，约占 case 数量的 1.17%。这说明业务迁移范围有限，不代表只改了几行定位器。

## 应优先补齐的内容

### 需求契约与测试范围没有同步说明

fork 没有提交 S1 放宽清单、B1 及 B1-C01 至 C07 的解释，README 和 requirements.yaml 也保持原样。代码注释却引用 S1、B1 和 method B。

例如 Keep 的 requirements.yaml 第 184 行和第 201 行仍明确要求 Note editor 的 dialog；新驱动接受内联编辑器。笔记记录的 region、固定名称等旧约定也仍存在。因此仓库读者无法仅从公开需求判断这些变化属于允许表达，还是测试遗漏了要求。

建议提交轻量的兼容契约说明，明确仅作用于哪些需求及前置流程、与祖先条款的关系、优先级、业务不变量、允许变化和必要的可访问性。也可同步修订对应 YAML。不要只加一个未被 README 引用的 B1 文件，而留下互相冲突的验收标准。

### 评测器自测没有迁入

本地有 11 个观察器夹具和 9 个驱动夹具，覆盖通知重复标题、隐藏副本、邻居高亮、嵌套弹窗、隐藏 checkbox、标签装饰、令牌输入及淡入时序。fork 没有这些自测和运行入口。

这些夹具是防止后续改坏 D 的直接依据，建议作为独立自测目录提交，并使用独立配置，避免被默认产品验收命令混入。无需同时搬入整个研究环境或所有构建缓存。

### 验证依据与结果归因尚未发布

fork 没有结果报告、D-1 至 D-12 变更记录及支持范围说明。建议至少提交一个精简验证摘要，链接材料与证据，注明单执行者标签、非盲验收、注入缺陷及视觉义务核验限制。

ledger 已迁入，但默认 setup 仍只输出 list/HTML，没有实验 runner/scorer 的 PASS、REQUIREMENT_FAIL、ADAPTATION_UNKNOWN 等顶层归因。若 fork 要对外提供这类分类，需要补 JSON 报告入口和最小归因工具；若只保留标准 Playwright 通过/失败，则应明确定位失败不等同于业务错误。

## 尚未扩展到其他测试的内容

Keep 的旧 helpers.ts 仍以精确 role/name 查找编辑器和笔记，并用 getByText(content, exact=true) 验证正文；其他需求仍调用它。BookStack 其他测试也继续使用旧 helper 的标签和 placeholder 定位。新驱动尚未取代这些公共调用。

10 月 17 日审查中的遗留项如下。它们是当时的风险与局部反例；本轮以源码确认其表达式仍存在，不把它们升级为已经完整复现的应用缺陷。

| 项目 | fork 状态 |
| --- | --- |
| Keep 多行正文读取 | 新测试已使用 D；旧 helpers 及其调用者保留原方式 |
| Keep 通知等待预算 | REQ-2.4 等待 60 秒，setup 仍默认整项 10 秒，未新增局部覆盖 |
| Keep 叠加同名通知 | notice 仍按单元素定位，相关旧流程未迁移 |
| 12306 订单行精确文字 | row helper 仍依赖精确文本 |
| 12306 车次位于行头 | trainIds 仍仅读取 cell，不含 rowheader |
| Ctrip 嵌套列表 | flightOrder 与 REQ-2.4 仍遍历或计数后代 listitem |
| Stack Overflow Viewed 前缀 | REQ-3.2 仍检查该前缀 |

这些内容此前没有全部实现修复，所以更准确地说是后续覆盖范围，而不是已经完成的 D 代码被遗漏提交。应逐项增加针对性回归并验证业务负例后再迁移，避免直接对所有应用机械替换定位器。

## 本次检查的证据与边界

机器可读结果保存在同目录的 2026-10-21-fork-migration-evidence 下。source-comparison.json 记录逐文件 hash，runtime-summary.json 记录测试发现、自测和迁移冒烟检查。

测试配置来自 fork 的 setup 脚本生成段，使用缓存的 Playwright 1.57.0 依赖；没有重新安装依赖。生成的默认配置用于迁移冒烟，保留三个 spec 的 120 秒覆盖。测试应用使用已构建缓存，每个目标重新启动、重置，并使用新的浏览器上下文。自测使用独立配置，无产品服务。

全部六个应用的测试发现成功，共 514 个 case；这不是全库 514 个场景的运行通过证明。20 个本地自测针对 fork 的实际库文件运行，全部通过。

迁移冒烟共 12 个需求级单位、24 次 case 执行，单次运行：4 个正确单位均通过，8 个缺陷均在目标义务处被拒绝；无缺失 case 或导入错误。具体结果见 runtime-summary.json。它是一次迁移检查，不替代原实验的 K=3、K=10 或完整 72 单位验证，也没有重新确认材料标签。

## 建议的下一次提交

先补契约与 README、20 个自测及入口、精简验证摘要。随后将旧 helpers 的复用流程逐步迁移到 D，每次迁移带对应正确表达与业务缺陷回归。原始截图、视频、node_modules、构建目录和完整研究草稿不必全部放进主仓库。

## 来源

1. [被核对提交](https://github.com/Neilchen863/arc-bench/commit/ae6d8e80cb8775e5ecb5903e038ed31bcdcd2efb)。
2. 本地 experiments/benchmark-fidelity-v2 的 methods、protocol/changes.jsonl、methods/selftest 和 analysis/REPORT.md。
3. 本地 docs/reviews/2026-10-17-upstream-false-rejection-review.md。仅用于核对尚未覆盖的旧风险。
