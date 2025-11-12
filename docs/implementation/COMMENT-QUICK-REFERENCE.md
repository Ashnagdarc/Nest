# Comment Writing Quick Reference

**For**: Nest Development Team  
**Purpose**: Fast reference for writing quality code comments

---

## 🎯 When to Comment

### ✅ DO Comment

- **Business logic** - Why this calculation/flow exists
- **Performance optimizations** - Impact and tradeoffs
- **Security checks** - What threat they prevent
- **Workarounds** - Why we can't do it the "right" way
- **Data transformations** - Why format changes are needed
- **Edge cases** - Non-obvious scenarios handled
- **API contracts** - Request/response format and side effects
- **Complex algorithms** - Step-by-step breakdown with examples

### ❌ DON'T Comment

- **Obvious code** - "Set loading to true"
- **Type information** - TypeScript already shows types
- **Code repetition** - If code is self-explanatory
- **Commented-out code** - Delete it (it's in git history)
- **Placeholder text** - "TODO: Implement this"

---

## ✍️ Comment Templates

### Function/Method

```typescript
/**
 * [One-line description of what it does]
 *
 * Why: [Business reason or technical constraint]
 *
 * Example: [Concrete input/output or usage]
 *
 * @param paramName - What it represents (not just type)
 * @returns What the value means in context
 */
```

### Complex Logic Block

```typescript
/**
 * [What this section accomplishes]
 *
 * Why: [Why we need this approach]
 *
 * Note: [Any gotchas or important details]
 */
```

### Workaround

```typescript
/**
 * Workaround: [Brief issue description]
 *
 * Why: [Root cause - library bug, browser quirk, etc.]
 *
 * TODO: [Ideal solution to implement later]
 * See: [Link to issue or documentation]
 */
```

### Performance Optimization

```typescript
/**
 * [Optimization technique]
 *
 * Impact: [Measurable benefit - "Reduces API calls by 80%"]
 *
 * Tradeoff: [Any downsides - memory, complexity, etc.]
 */
```

### Security Check

```typescript
/**
 * Security: [What threat this prevents]
 *
 * Attack vector: [How someone could exploit without this]
 */
```

---

## 🚫 Banned Patterns

### LLM-Style Writing

```typescript
// ❌ BAD
/**
 * This function facilitates the implementation of robust
 * data processing capabilities by leveraging modern best practices
 * to deliver an optimal user experience.
 */

// ✅ GOOD
/**
 * Processes user data and removes duplicates
 *
 * Why: Users can submit duplicate entries via form spam.
 * Deduplication prevents inventory count errors.
 */
```

### Stating the Obvious

```typescript
// ❌ BAD
// Get the user ID
const userId = user.id;

// Set loading state to true
setLoading(true);

// ✅ GOOD
// No comment needed - code is self-explanatory
```

### Redundant Type Info

```typescript
// ❌ BAD
/**
 * @param name - string representing the user's name
 * @param age - number representing the user's age
 */
function createUser(name: string, age: number) {}

// ✅ GOOD
/**
 * @param name - User's full name (first + last)
 * @param age - Must be 18+ for account creation
 */
function createUser(name: string, age: number) {}
```

---

## 📏 Quality Checklist

Before committing, ask:

- [ ] Does this explain **WHY**, not **WHAT**?
- [ ] Would I need this in 6 months?
- [ ] Is it specific (not vague marketing speak)?
- [ ] Does it use human voice (not LLM patterns)?
- [ ] Have I removed banned words?
- [ ] Is it necessary, or is the code name enough?

---

## 🎨 Style Guidelines

### Voice and Tone

- Write like you'd explain to a colleague
- Be direct: "This prevents X" not "This might help prevent X"
- Use active voice: "We validate input" not "Input is validated"
- Contractions are okay: "don't" instead of "do not"

### Specificity

- Bad: "Optimizes performance"
- Good: "Reduces API calls by 80% on typical search"

- Bad: "Handles edge cases"
- Good: "Handles empty arrays and null values from legacy data"

### Banned Words

| Don't Use  | Use Instead   |
| ---------- | ------------- |
| facilitate | help / enable |
| leverage   | use           |
| utilize    | use           |
| implement  | do / create   |
| actually   | (remove)      |
| basically  | (remove)      |
| great      | (be specific) |

---

## 💡 Examples from Codebase

### ✅ Excellent Comment

```typescript
/**
 * Debounces search input to avoid excessive API calls
 *
 * Why: Without debouncing, typing "camera" fires 6 requests.
 * With 300ms delay, we only search once user stops typing.
 *
 * Impact: Reduces API load by ~80% on typical search usage.
 */
const useDebouncedSearch = (value: string, delay: number = 300) => {
```

### ✅ Great Workaround Comment

```typescript
/**
 * Use service role key instead of user session
 *
 * Why: RLS policies block admins from updating gear inventory directly.
 * Service role bypasses RLS to allow atomic approval + inventory update.
 *
 * Security: This endpoint should have auth middleware to verify admin role.
 */
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
```

### ✅ Helpful Business Context

```typescript
/**
 * Try junction table first, fall back to gear_ids array
 *
 * Why: Old requests (before Feb 2024) stored gear_ids[] directly.
 * New requests use gear_request_gears junction for quantity tracking.
 *
 * We support both to avoid breaking historical data.
 */
if (request.gear_request_gears && Array.isArray(request.gear_request_gears)) {
```

---

## 🔧 Common Scenarios

### API Endpoints

```typescript
/**
 * POST /api/requests/approve
 *
 * Approves a gear request and updates inventory
 *
 * Body: { requestId: string }
 * Returns: { success: boolean, message?: string, error?: string }
 *
 * Side effects:
 * - Updates request status to 'approved'
 * - Decrements gear available_quantity
 * - Sends notification to requester
 */
```

### Complex State Updates

```typescript
/**
 * Aggregate gear by name with availability status
 *
 * Why: Requests can include multiple units of same gear type.
 * We need to show total quantity + combined availability state.
 *
 * Example: "Camera x3 (2 available, 1 in maintenance)"
 */
```

### Error Handling

```typescript
/**
 * Filter out empty error objects from fetch API
 *
 * Why: Some network libraries throw `{}` on timeout.
 * We only want to log actual error messages to avoid noise.
 */
if (error && (typeof error === 'string' || error instanceof Error || ...)) {
```

---

## 📚 Resources

- [Code Review Guidelines](./command/code-review.md)
- [Writing Style Guide](./rules/writting.md)
- [Comment Strategy Progress](./COMMENT-STRATEGY-PROGRESS.md)

---

**Quick Tip**: When in doubt, explain the **why** and the **impact**. Future you will thank present you! 🙏
