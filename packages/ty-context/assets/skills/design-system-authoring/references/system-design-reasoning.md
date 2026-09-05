# System Design Reasoning Brief

Create this concise, task-local decision brief before every new design-system generation and before every material candidate revision. It is candidate input, not private chain-of-thought, Design Authority, Context, workflow state or an adoption record. Rebuild it when scope, product purpose, target conditions, immutable constraints or accepted/rejected/unresolved preferences materially change; never reuse a stale brief merely because the provider still has an earlier candidate.

Pass the complete current brief through the provider's existing `sourceNotes` field on candidate creation. If a live revision method does not expose `sourceNotes`, do not invent a field or API: revise only a candidate whose retained `sourceNotes` already contains the current brief, include the exact changed decision rows in the supported feedback field, or create a new bounded candidate with the current brief. Keep secrets and unrelated repository material out of provider input.

## Required English-complete template

Every heading and field below is required. Use project-specific values and relationships; do not substitute a generic product-type template, fixed viewport list or style adjective.

1. **Scope and people**
   - mode and design-system scope;
   - target audience, primary tasks and product type;
   - platforms, surfaces, input methods and physical/use environment;
   - immutable product, brand, accessibility, compatibility and supplied-reference constraints.
2. **Purpose and preference state**
   - intended purpose and emotion;
   - accepted preferences, rejected preferences and unresolved choices as three separate sets;
   - desired visual character, avoided visual character and explicit anti-goals;
   - evidence that any otherwise-common enterprise blue, dark field, card wall, uniform large radius, heavy heading, oversized visible control or unconditional focus ring is suitable; absent evidence, keep it out of the candidate.
3. **Hierarchy, space and visual weight**
   - information hierarchy, focal points and accent-color budget;
   - screen/layout whitespace, inter-group rhythm, component-internal whitespace and visual-weight whitespace;
   - density by region and task, including where implicit grouping is preferred over cards or borders;
   - typography hierarchy, weight, line height, long-text behavior and type occupancy inside controls;
   - visible surface versus hit target, internal padding versus type line height, group gap versus item gap and simultaneous-focus limits.
4. **Containment and component semantics**
   - container/card eligibility rather than card-by-default;
   - radius, border, elevation and background-fill grammar by containment role;
   - action hierarchy;
   - components classified first by user intent, information responsibility and state model, then by appearance;
   - shared primitives and an explicit reason that similar controls merge, reuse one primitive or remain distinct.
5. **Behavior and adaptation**
   - touch, pointer, keyboard, editing, focus and assistive-technology behavior;
   - accessibility fallback, text scaling, long labels and localization;
   - motion cause, distance, duration, easing, interruption and reduced-motion behavior;
   - responsive, safe-area, narrow/wide, window, fold, system-UI and software-keyboard behavior for the selected target conditions.
6. **Reference translation**
   - for each external reference: source principle, project-specific translation and prohibited copying;
   - never treat a platform or design-system name as a sufficient rationale.
7. **Decision rows**
   - one stable choice key per material choice;
   - design goal and scenario-linked rationale;
   - exact Token, component, relationship or pattern realization;
   - a counterexample or forbidden result;
   - the handbook section and representative showcase scenario that will expose the choice.

## Candidate and showcase rules

- Preserve accepted, rejected and unresolved preferences within the same candidate iteration. Rejected and unresolved material cannot silently reappear as adopted semantics.
- The primary artifact is an engineering design-system handbook. Token families, component catalogue/contracts, cross-Token relationships, behavior and provenance precede application scenes. Application scenes are last, marked `supplemental-validation`, and may demonstrate composition but cannot define a second component system.
- Review every target-declared viewport, text-scale, long-label and reduced-motion condition, plus any other material declared condition, through the project's existing reproducible browser/E2E route. Use the target's exact declared values; do not introduce a global fixed mobile viewport policy. If the project lacks an observable route, report that condition as unverified or decision-required instead of claiming it from static markup.
- Structural completeness, hashes and render checks can reject the wrong artifact category, stale projection, overflow and missing coverage. They cannot establish aesthetic suitability. Explicit human or validly delegated candidate selection remains required.

## 中文等价核对表（additive）

下面各项与英文模板逐项等价，不是缩减版，也不替代英文完整合同：

1. **范围与人群**：模式和系统范围；目标用户、主任务、产品类型；平台、surface、输入方式、物理/使用环境；不可变的产品、品牌、无障碍、兼容性与参考资料约束。
2. **目的与偏好状态**：设计目的和期望情绪；分别记录已接受、已拒绝、待决定；期望与避免的视觉性格及明确反目标；企业蓝、大面积深色、卡片墙、统一大圆角、粗重标题、膨胀的可见控件或无条件焦点框必须有场景证据，否则不得进入候选。
3. **层级、留白和视觉重量**：信息层级、视觉焦点、强调色预算；屏幕/布局留白、信息组间节奏、组件内部留白、视觉重量留白四层；区域密度与隐式分组；字体层级、字重、行高、长文本、控件内字体占比；可见表面/命中区域、内边距/行高、组间距/项间距、同时焦点数量等关系。
4. **容器与组件语义**：卡片/容器适用条件而非默认套框；按承载关系建立圆角、边框、高程、填充语法；动作层级；组件先按用户意图、信息职责、状态模型分类，再按外观分类；相似组件为什么合并、复用共同原语或保持独立。
5. **行为与适配**：触摸、指针、键盘、编辑、焦点、辅助技术；无障碍回退、文本缩放、长标签、国际化；动效因果、距离、时长、缓动、中断与 reduced motion；按选定 target 声明的条件覆盖响应式、安全区、窄/宽屏、窗口、折叠、系统 UI 与软键盘。
6. **参考资料翻译**：每个参考都写“来源原则 → 项目翻译 → 禁止照搬”，不能用设计系统或平台名称代替理由。
7. **决策行**：每个材料性选择具有稳定 key、设计目标、场景化理由、Token/组件/关系/模式落实、反例/禁止结果，以及在手册章节和代表性 showcase 场景中的验证位置。

候选迭代必须保留已接受/已拒绝/待决定增量；工程化设计系统手册是主产物，应用场景只能最后作为 `supplemental-validation`；按 target 声明的 viewport、text scale、长标签、reduced motion 等条件走项目现有可复现浏览器/E2E 入口，不硬编码全局移动端列表；结构检查不能代替人工审美选择。
