# Solution Verification & Implementation Standards

## 🎯 Core Principle
**Be 99.9% sure before implementing any solution.**

---

## 📋 Pre-Implementation Checklist

### 1. Deep Dive Analysis (MANDATORY)
Before proposing or implementing ANY solution, you MUST:

- [ ] **Understand the Root Cause**
  - Identify the exact problem, not just symptoms
  - Trace the issue to its source
  - Verify assumptions with data/logs/code inspection

- [ ] **Research Thoroughly**
  - Check official documentation
  - Review similar issues in the codebase
  - Consider edge cases and side effects
  - Verify compatibility with existing systems

- [ ] **Validate the Solution**
  - Ensure the solution addresses the root cause
  - Confirm it won't introduce new issues
  - Check for breaking changes
  - Verify it follows project conventions

### 2. Solution Vetting Process

#### Step 1: Problem Analysis
```
1. What is the exact problem?
2. What is the root cause?
3. What are the symptoms vs actual issue?
4. What data/evidence supports this diagnosis?
```

#### Step 2: Solution Design
```
1. What are 2-3 possible solutions?
2. What are the pros/cons of each?
3. Which solution is most appropriate and why?
4. What are potential side effects?
```

#### Step 3: Impact Assessment
```
1. What files/systems will be affected?
2. Are there any breaking changes?
3. What are the risks?
4. Is there a rollback plan?
```

#### Step 4: Verification
```
1. Have I tested this approach?
2. Does it work in all scenarios?
3. Are there edge cases I'm missing?
4. Am I 99.9% confident this will work?
```

---

## 📝 Documentation Requirements

### ALWAYS Document Changes

Every change MUST include:

#### 1. Change Summary
- **What** was changed
- **Why** it was changed
- **How** it was changed

#### 2. Technical Details
- Files modified
- Functions/components affected
- Database schema changes (if applicable)
- API changes (if applicable)

#### 3. Testing Evidence
- What was tested
- Test results
- Edge cases considered

#### 4. Rollback Plan
- How to undo the change if needed
- Potential risks of rollback

### Documentation Format

```markdown
## Change: [Brief Description]
**Date**: YYYY-MM-DD
**Type**: [Feature/Fix/Refactor/Database/etc.]

### Problem
[Detailed description of the issue]

### Root Cause
[What caused the problem]

### Solution
[Detailed explanation of the fix]

### Files Changed
- `path/to/file1.ts` - [What changed]
- `path/to/file2.ts` - [What changed]

### Testing
- [x] Tested scenario A
- [x] Tested scenario B
- [x] Verified no breaking changes

### Risks & Considerations
- [Any potential issues or things to watch]

### Rollback Plan
[How to undo if needed]
```

---

## 🚫 Red Flags - STOP and Re-evaluate

If ANY of these apply, STOP and re-analyze:

- ❌ You're not 100% sure of the root cause
- ❌ The solution feels like a "band-aid" or workaround
- ❌ You haven't checked the documentation
- ❌ You're making assumptions without verification
- ❌ The change affects multiple systems and you haven't mapped dependencies
- ❌ You can't explain WHY this solution works
- ❌ There are multiple ways to solve it and you haven't compared them
- ❌ You haven't considered edge cases
- ❌ The solution introduces technical debt

---

## ✅ Implementation Standards

### Before Writing Code
1. ✅ Root cause identified and verified
2. ✅ Solution vetted and validated
3. ✅ Impact assessed
4. ✅ Documentation prepared
5. ✅ 99.9% confidence level achieved

### During Implementation
1. ✅ Follow project conventions
2. ✅ Write clean, maintainable code
3. ✅ Add inline comments for complex logic
4. ✅ Handle edge cases
5. ✅ Include error handling

### After Implementation
1. ✅ Test the solution thoroughly
2. ✅ Verify no breaking changes
3. ✅ Update documentation
4. ✅ Commit with descriptive message
5. ✅ Monitor for issues

---

## 📊 Confidence Levels

### 99.9% Confident (PROCEED)
- Root cause clearly identified
- Solution tested and verified
- All edge cases considered
- Documentation complete
- No red flags

### 80-99% Confident (INVESTIGATE MORE)
- Need more testing
- Some edge cases unclear
- Minor uncertainties
- **Action**: Research more, test more

### <80% Confident (STOP)
- Root cause unclear
- Solution unverified
- Major uncertainties
- **Action**: Deep dive required, ask user for clarification

---

## 🎓 Learning from Changes

After every significant change, document:
1. What worked well
2. What could be improved
3. Lessons learned
4. Patterns to reuse or avoid

---

## 📁 Where to Document

### Code Changes
- Inline comments for complex logic
- Function/component docstrings
- README updates if user-facing

### Database Changes
- Migration files with comments
- Update `/rules/database-queries.md` if schema changes
- Document in project changelog

### Architecture Changes
- Update `/docs` directory
- Create ADR (Architecture Decision Record) if major
- Update project README

### Bug Fixes
- Link to issue/ticket if exists
- Document in commit message
- Add to changelog

---

## 🔄 Continuous Improvement

This process should:
- Reduce bugs and rework
- Increase code quality
- Build institutional knowledge
- Make debugging easier
- Speed up onboarding

---

**Remember**: Taking time to verify and document saves time in the long run.

**Last Updated**: 2026-01-26  
**Maintained By**: AI Assistant (Antigravity)
