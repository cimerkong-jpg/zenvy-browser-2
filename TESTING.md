# 🧪 Testing Guide - Zenvy Browser

## 📋 Testing Workflow (REQUIRED)

**⚠️ IMPORTANT:** Theo `.claude/rules/workflow.md`, PHẢI test trước khi commit!

---

## ✅ Pre-Commit Checklist

### 1. Build Check
```bash
npm run build
```
**Expected:** No errors, build completes successfully

### 2. Type Check
```bash
npm run typecheck
```
**Expected:** No TypeScript errors

### 3. Run Tests
```bash
node test-antidetect.js
```
**Expected:** All tests pass (22/22)

### 4. Manual Testing
```bash
npm start
```
**Test:**
- ✅ App launches
- ✅ Create profile works
- ✅ Open profile works
- ✅ Browser launches with test page
- ✅ Fingerprint test shows 100/100
- ✅ No console errors (F12)

---

## 🔄 Automated Pre-Commit Hook

**Setup:** (Already done)
```bash
npm install --save-dev husky
chmod +x .husky/pre-commit
```

**What it does:**
1. Runs `npm run build`
2. Runs `npm run typecheck`
3. Runs tests (if exist)
4. Blocks commit if build/typecheck fails

**To bypass (NOT recommended):**
```bash
git commit --no-verify -m "message"
```

---

## 🧪 Test Levels

### Level 1: Unit Tests (Future)
```bash
npm test
```
Test individual functions in isolation

### Level 2: Integration Tests
```bash
node test-antidetect.js
```
Test features working together

### Level 3: E2E Tests (Future)
```bash
npm run test:e2e
```
Test complete user workflows

### Level 4: Manual Testing
```bash
npm start
```
Human testing on real app

---

## 📝 Testing New Features

### When adding new feature:

#### 1. Write Tests First (TDD)
```javascript
// test-new-feature.js
console.log('Testing Cookie Import...')
// Test code here
```

#### 2. Implement Feature
```typescript
// src/main/cookies.ts
export function importCookies() {
  // Implementation
}
```

#### 3. Run Tests
```bash
node test-new-feature.js
```

#### 4. Manual Test
```bash
npm start
# Test in UI
```

#### 5. Build Check
```bash
npm run build
npm run typecheck
```

#### 6. Commit
```bash
git add .
git commit -m "feat: add cookie import"
# Pre-commit hook runs automatically
```

---

## 🎯 Test Coverage Goals

### Current (v0.0.1)
- ✅ Antidetect features: 100%
- ✅ Profile management: Manual only
- ✅ Browser launch: Manual only

### Target (v0.1.0)
- ✅ All features: Automated tests
- ✅ Code coverage: >80%
- ✅ E2E tests: Critical paths

---

## 🐛 Bug Testing Workflow

### When bug reported:

#### 1. Reproduce
```bash
npm start
# Follow steps to reproduce
```

#### 2. Write Test
```javascript
// test-bug-123.js
console.log('Testing bug #123...')
// Test that fails with bug
```

#### 3. Fix Bug
```typescript
// Fix code
```

#### 4. Verify Test Passes
```bash
node test-bug-123.js
```

#### 5. Manual Verify
```bash
npm start
# Verify bug is fixed
```

#### 6. Commit
```bash
git commit -m "fix: resolve bug #123"
```

---

## 📊 Test Reports

### After testing, document:

```markdown
## Test Results - [Date]

### Build
- ✅ Build successful
- ⏱️ Time: 15s

### Type Check
- ✅ No errors
- 📝 Files checked: 25

### Automated Tests
- ✅ 22/22 passed
- ⏱️ Time: 2s

### Manual Tests
- ✅ App launch
- ✅ Profile creation
- ✅ Browser launch
- ✅ Fingerprint test: 100/100
- ✅ No console errors

### Issues Found
- None

### Ready to Commit
- ✅ Yes
```

---

## 🚀 CI/CD Testing (Future)

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Test
on: [push, pull_request]
jobs:
  test:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm run build
      - run: npm run typecheck
      - run: node test-antidetect.js
```

---

## 📝 Testing Checklist Template

Copy this for each feature:

```markdown
## Feature: [Name]

### Unit Tests
- [ ] Function A
- [ ] Function B
- [ ] Edge cases

### Integration Tests
- [ ] Feature works with existing code
- [ ] No regressions

### Manual Tests
- [ ] UI works correctly
- [ ] No console errors
- [ ] Performance acceptable

### Build Tests
- [ ] npm run build ✅
- [ ] npm run typecheck ✅
- [ ] No warnings

### Ready
- [ ] All tests pass
- [ ] Documentation updated
- [ ] Ready to commit
```

---

## 🎯 Quality Standards

### Before Commit
- ✅ Build passes
- ✅ Type check passes
- ✅ Tests pass (if exist)
- ✅ Manual testing done
- ✅ No console errors
- ✅ Performance OK

### Before Push
- ✅ All commits tested
- ✅ Branch builds successfully
- ✅ No merge conflicts

### Before Release
- ✅ Full test suite passes
- ✅ Manual testing on clean install
- ✅ DMG builds and installs
- ✅ Documentation updated
- ✅ Changelog updated

---

## 🔧 Troubleshooting Tests

### Build fails
```bash
rm -rf node_modules out .vite
npm install
npm run build
```

### Tests fail
```bash
# Check test file exists
ls test-*.js

# Run with verbose
node test-antidetect.js --verbose
```

### Pre-commit hook not running
```bash
chmod +x .husky/pre-commit
git config core.hooksPath .husky
```

---

**Remember: Test early, test often, test before commit!** ✅
