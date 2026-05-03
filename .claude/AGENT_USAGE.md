# Agent Usage Guide

## 🤖 Cách AI tự động sử dụng Agents

Khi bạn yêu cầu một task, tôi sẽ **tự động identify và apply** agent phù hợp dựa trên:

### 1. Task Detection Rules

#### 🔍 Research Tasks
**Triggers**: "research", "tìm hiểu", "so sánh", "evaluate", "alternatives"
**Agent**: `researcher.md`
**Actions**:
- Tìm kiếm thông tin từ nhiều sources
- So sánh options
- Đưa ra recommendation với lý do

**Example**:
- "Research electron-vite alternatives"
- "So sánh SQLite vs JSON storage"
- "Tìm hiểu fingerprint spoofing techniques"

---

#### 👁️ Code Review Tasks
**Triggers**: "review", "check code", "audit code", "code quality"
**Agent**: `reviewer.md`
**Actions**:
- Scan code theo 40+ checklist items
- Identify issues với severity levels
- Đưa ra verdict và action items

**Example**:
- "Review code trong src/main/browser.ts"
- "Check security của IPC handlers"
- "Audit toàn bộ codebase"

---

#### 🐛 Debug Tasks
**Triggers**: "debug", "fix bug", "lỗi", "error", "not working"
**Agent**: `debugger.md`
**Actions**:
- Analyze error logs và stack traces
- Root cause analysis
- Propose fixes với test cases

**Example**:
- "Debug lỗi Electron runtime"
- "Fix Chrome launch failure"
- "Tại sao app crash khi launch profile"

---

#### 📝 Documentation Tasks
**Triggers**: "document", "write docs", "API docs", "guide", "README"
**Agent**: `documentation.md`
**Actions**:
- Tạo API documentation
- Write user guides
- Create developer documentation

**Example**:
- "Document IPC APIs"
- "Tạo user guide cho profile management"
- "Write README cho dự án"

---

#### 🧪 Testing Tasks
**Triggers**: "test", "write tests", "unit test", "integration test"
**Agent**: `tester.md`
**Actions**:
- Generate test suites
- Write unit/integration/E2E tests
- Setup test infrastructure

**Example**:
- "Write tests cho profile CRUD"
- "Tạo integration tests cho browser launch"
- "Setup E2E testing"

---

#### 🔧 Refactoring Tasks
**Triggers**: "refactor", "improve code", "clean up", "optimize code structure"
**Agent**: `refactor.md`
**Actions**:
- Identify code smells
- Suggest refactoring
- Apply design patterns

**Example**:
- "Refactor IPC handlers"
- "Clean up database layer"
- "Improve React components structure"

---

#### 🚀 DevOps Tasks
**Triggers**: "CI/CD", "deploy", "build", "release", "pipeline"
**Agent**: `devops.md`
**Actions**:
- Setup CI/CD pipelines
- Configure builds
- Plan deployments

**Example**:
- "Setup GitHub Actions"
- "Configure electron-builder"
- "Plan release process"

---

#### ⚡ Performance Tasks
**Triggers**: "optimize", "performance", "slow", "memory leak", "speed up"
**Agent**: `performance.md`
**Actions**:
- Profile application
- Identify bottlenecks
- Suggest optimizations

**Example**:
- "Optimize app startup time"
- "Fix memory leak"
- "Speed up profile loading"

---

#### 🔌 Integration Tasks
**Triggers**: "integrate", "API", "third-party", "external service"
**Agent**: `integration.md`
**Actions**:
- Design API integrations
- Implement external services
- Handle authentication

**Example**:
- "Integrate proxy provider API"
- "Design fingerprint API integration"
- "Connect to external service"

---

#### 🏗️ Architecture Tasks
**Triggers**: "design", "architecture", "structure", "technical decision"
**Agent**: `architect.md` (Opus 4-7)
**Actions**:
- Design system architecture
- Make technical decisions
- Plan implementation

**Example**:
- "Design SQLite migration architecture"
- "Plan multi-window support"
- "Decide on state management approach"

---

#### 🎨 UI/UX Tasks
**Triggers**: "UI", "UX", "design", "user interface", "user experience"
**Agent**: `uiux.md` (Opus 4-7)
**Actions**:
- Design user interfaces
- Improve user experience
- Ensure accessibility

**Example**:
- "Improve profile creation flow"
- "Design better error states"
- "Make UI more accessible"

---

#### 🔐 Security Tasks
**Triggers**: "security", "vulnerability", "secure", "audit security"
**Agent**: `security.md` (Opus 4-7)
**Actions**:
- Security audit
- Identify vulnerabilities
- Suggest security improvements

**Example**:
- "Audit proxy credential storage"
- "Check for security vulnerabilities"
- "Secure IPC communication"

---

## 🎯 Multi-Agent Workflows

Một số tasks phức tạp cần **nhiều agents phối hợp**:

### Workflow 1: Add New Feature
```
1. Architect → Design feature architecture
2. Researcher → Research best practices
3. Developer → Implement feature
4. Tester → Write tests
5. Reviewer → Code review
6. Documentation → Document feature
```

### Workflow 2: Fix Critical Bug
```
1. Debugger → Identify root cause
2. Security → Check security implications
3. Developer → Implement fix
4. Tester → Verify fix
5. Reviewer → Review changes
```

### Workflow 3: Performance Optimization
```
1. Performance → Profile and identify bottlenecks
2. Architect → Design optimization strategy
3. Developer → Implement optimizations
4. Tester → Benchmark improvements
5. Reviewer → Review changes
```

### Workflow 4: Production Release
```
1. Reviewer → Final code review
2. Tester → Run full test suite
3. Security → Security audit
4. DevOps → Build and deploy
5. Documentation → Update changelog
```

---

## 🔄 Automatic Agent Selection

Tôi sẽ **tự động chọn agent** dựa trên:

1. **Keywords trong request**: Detect từ khóa trigger
2. **Context của task**: Hiểu mục đích thực sự
3. **Current state**: Xem trạng thái hiện tại của dự án
4. **Complexity**: Chọn Sonnet 4-6 hoặc Opus 4-7

### Decision Logic
```
if (task.includes('debug') || task.includes('fix bug')) {
  agent = 'debugger'
} else if (task.includes('design') || task.includes('architecture')) {
  agent = 'architect'  // Opus 4-7 for complex thinking
} else if (task.includes('security') || task.includes('vulnerability')) {
  agent = 'security'  // Opus 4-7 for thorough analysis
} else if (task.includes('UI') || task.includes('UX')) {
  agent = 'uiux'  // Opus 4-7 for design thinking
} else if (task.includes('test')) {
  agent = 'tester'
} else if (task.includes('review')) {
  agent = 'reviewer'
}
// ... etc
```

---

## 💡 Best Practices

### Khi yêu cầu task:

✅ **Good**:
- "Debug lỗi Electron không start được"
- "Review security của proxy storage"
- "Optimize app startup performance"
- "Design architecture cho cookie import feature"

❌ **Less Clear**:
- "Fix it"
- "Make it better"
- "Check this"

### Cung cấp context:
- File paths nếu có
- Error messages
- Expected vs actual behavior
- Environment details

---

## 🎓 Training Data

Mỗi agent đã được "trained" với:
- ✅ Quy trình làm việc cụ thể
- ✅ Format output chuẩn
- ✅ Best practices
- ✅ Context-specific examples cho Zenvy Browser
- ✅ Quality checklists

Điều này giúp tôi **consistently apply** đúng agent cho đúng task!

---

## 🚀 Next Steps

Bây giờ bạn chỉ cần:
1. **Yêu cầu task bình thường**
2. **Tôi sẽ tự động identify agent phù hợp**
3. **Apply agent guidelines để complete task**
4. **Deliver kết quả theo format của agent**

Không cần phải explicitly mention agent name - tôi sẽ tự động detect và apply! 🎯
