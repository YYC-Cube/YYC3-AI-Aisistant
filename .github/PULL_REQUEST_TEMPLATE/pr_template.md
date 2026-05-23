## 📋 PR Description

### 变更类型 (请勾选一项)
- [ ] 🐛 Bug Fix
- [ ] ✨ New Feature
- [ ] 💄 UI/UX Improvement
- [ ] 🔧 Refactor
- [ ] 📝 Documentation
- [ ] ⚡ Performance
- [ 🔒 Security
- [ ] 🧪 Test Coverage

### 相关 Issue (如有)
Closes #(issue number)

### 变更摘要
<!-- 简要描述本次变更的内容和目的 -->

### 📸 截图/演示 (如适用)
<!-- 添加截图或 GIF 展示变更效果 -->

---

## ✅ 检查清单

### 代码质量
- [ ] 代码遵循项目 ESLint 规则 (`npm run lint` 通过)
- [ ] TypeScript 类型检查通过 (`npm run typecheck` 无错误)
- [ ] 新增功能已添加单元测试 (`npm test` 全部通过)
- [ ] 测试覆盖率未显著下降

### 文档更新
- [ ] README.md 已更新（如涉及新功能）
- [ ] 组件 Props 类型注释完整
- [ ] 复杂逻辑添加了行内注释

### 安全检查
- [ ] 未引入新的 `any` 类型（除非必要且有注释说明）
- [ ] 未提交敏感信息（API Key、密码等）
- [ ] 未在代码中硬编码配置值

### 兼容性
- [ ] 浏览器兼容性已验证
- [ ] 移动端响应式正常
- [ ] 无 console.log/console.warn 残留

---

## 🧪 测试步骤

<!-- 提供详细的测试步骤，让 Reviewer 可以复现和验证 -->

1. 
2. 
3. 

---

## 💬 Additional Notes

<!-- 其他需要 Reviewer 注意的事项 -->

### 五维驱动评估
| 维度 | 影响评估 |
|------|----------|
| **时间维度** | 构建时间影响: ___ |
| **空间维度** | Bundle size 影响: ___ |
| **属性维度** | 性能/安全/可维护性: ___ |
| **事件维度** | 用户交互流程变化: ___ |
| **关联维度** | 组件依赖关系变化: ___ |

---

> **Reviewers**: 请确保所有 CI 检查通过后再合并
> **Merge Strategy**: Squash and Merge (保持主分支整洁)
