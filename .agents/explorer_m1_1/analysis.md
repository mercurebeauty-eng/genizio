# Functional Audit Report — User Flows 1-3
**Project**: Génizio End-to-End Functional Audit & Systemic Reliability Fix
**Agent**: Explorer 1 (`explorer_m1_1`)
**Date**: 2026-07-21
**Scope**: User Flow 1 (Auth & Access), User Flow 2 (Profile Management & Behavioral Engines), User Flow 3 (Challenge Generation Engine & Completion)

---

## Executive Summary

A comprehensive read-only functional audit of **User Flows 1–3** in the Génizio application was conducted. The audit analyzed the end-to-end execution chain across all components:
`Trigger -> Event -> Logic -> State Change -> Side Effect -> User Feedback`.

A total of **15 critical and high-priority defects** were identified across authentication, profile management, behavioral engine calculations, challenge generation, and proof validation. Key systemic patterns include:
- **Error Swallowing & Broad Catches**: Multiple server functions and UI catch blocks silently catch errors or misclassify network failures as permission errors.
- **Unhandled Async Exceptions**: Missing `try/catch/finally` blocks around Supabase calls causing permanent loading spinners or frozen UI buttons.
- **LLM Parsing Vulnerabilities**: `JSON.parse` calls on raw LLM outputs without markdown fence stripping (` ```json `), leading to unhandled promise rejections.
- **Missing User Feedback**: Operations failing silently without Sonner toast notifications or user-facing status indicators.

Baseline verification confirmed:
- `npx tsc --noEmit`: 0 errors.
- `npx vitest run`: 149 passed across 11 test suites.

---

## Detailed Audit Findings by Flow

---

### User Flow 1: Auth & Access
*Routes & Components Audited*: `/auth`, `use-session.ts`, `auth-middleware.ts`, `admin-middleware.ts`, `admin.functions.ts`, `admin.tsx`, `admin.index.tsx`, `admin.products.tsx`, `admin.supervisors.tsx`.

#### Defect D-01: Infinite Loading Spinner in `useSession` when `getSession()` Fails
- **File Path**: `src/hooks/use-session.ts` (lines 13–16)
- **Execution Chain**: Component Mount -> `useEffect` -> `supabase.auth.getSession().then(...)`
- **Description**: `supabase.auth.getSession()` uses `.then()` without a `.catch()` block. If `getSession()` fails due to network outage, offline status, or endpoint error, `setLoading(false)` is never called.
- **Impact**: High. The entire app remains permanently stuck on `loading: true`, displaying a full-screen loading spinner without any fallback or recovery option.
- **Proposed Fix**:
  ```typescript
  supabase.auth.getSession()
    .then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    })
    .catch((err) => {
      console.error("Failed to retrieve session:", err);
      setLoading(false);
    });
  ```

#### Defect D-02: Permanent Disabled Button & Missing Toast Notification on OAuth Error
- **File Path**: `src/routes/auth.tsx` (lines 20–33)
- **Execution Chain**: Click "Continuer avec Google" -> `google()` -> `setBusy(true)` -> `supabase.auth.signInWithOAuth()`
- **Description**: `google()` sets `setBusy(true)` and awaits `signInWithOAuth` without `try/catch`. If an unhandled promise rejection or network exception occurs, `setBusy(false)` is skipped. Additionally, when Supabase returns an error object, no Sonner toast is shown.
- **Impact**: Medium. The button remains permanently disabled displaying `...`, preventing retry. The user receives no toast notification explaining the issue.
- **Proposed Fix**:
  ```typescript
  const google = async () => {
    setError(null);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: window.location.origin + "/profiles" },
      });
      if (error) {
        setError(error.message ?? "Connexion Google échouée");
        toast.error(error.message ?? "Connexion Google échouée");
      }
    } catch (err: any) {
      const msg = err?.message ?? "Erreur lors de la connexion Google";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };
  ```

#### Defect D-03: Unhandled Rejection in Admin Guard Layout (`admin.tsx`)
- **File Path**: `src/routes/admin.tsx` (lines 28–30)
- **Execution Chain**: Mount `/admin` -> `useEffect` -> `checkAdmin()` -> `setIsAdmin()` / `setChecking(false)`
- **Description**: `checkAdmin()` is called via `.then()` and `.finally()` without `.catch()`. If the server function throws an error (e.g. network failure, expired JWT, server exception), the rejection is unhandled and `.finally()` sets `checking = false` with `isAdmin = false`.
- **Impact**: High. Network glitches or temporary server errors result in rendering the "Accès Interdit" screen instead of informing the user of a server/connection issue.
- **Proposed Fix**:
  ```typescript
  checkAdmin()
    .then(({ isAdmin: isUserAdmin }) => setIsAdmin(isUserAdmin))
    .catch((err) => {
      console.error("Admin status check failed:", err);
      toast.error("Erreur de vérification des droits administrateur.");
    })
    .finally(() => setChecking(false));
  ```

#### Defect D-04: Network/Server Errors Misclassified as "Forbidden" Access in Admin Sub-routes
- **File Path**: `src/routes/admin.products.tsx` (lines 127–146) & `src/routes/admin.supervisors.tsx` (lines 41–52)
- **Execution Chain**: Mount `/admin/products` -> `refetch()` -> `Promise.all(...)` -> `catch { setForbidden(true); }`
- **Description**: In `refetch()`, all errors thrown during API calls are caught by a catch block that blindly calls `setForbidden(true)`.
- **Impact**: High. Any network disconnect, 500 server error, or API timeout is misidentified as an authorization failure, showing an "Accès réservé à l'administrateur" banner to legitimate admins.
- **Proposed Fix**: Check error message / status code before setting `forbidden`. Only set `forbidden` if error message indicates an access error (`Accès refusé` / `403`), otherwise trigger `toast.error("Erreur de chargement des données admin")`.

#### Defect D-05: Silent Error Swallowing in Supervisor Child List Fetch
- **File Path**: `src/routes/admin.supervisors.tsx` (lines 58–60)
- **Execution Chain**: Mount `/admin/supervisors` -> `listChildrenFn().catch(() => setChildProfiles([]))`
- **Description**: The promise catch block silently swallows errors and sets `childProfiles` to `[]`.
- **Impact**: Low-Medium. If fetching children fails, the dropdown remains silently empty without any error message or indication of failure.
- **Proposed Fix**: Log error with `console.error` and trigger `toast.error("Erreur lors du chargement des profils enfants")`.

---

### User Flow 2: Profile Management & Behavioral Engines
*Routes & Components Audited*: `/profiles`, `/profiles/manage`, `ProfileDialog.tsx`, `ProfileCard.tsx`, `hypotheses.functions.ts`, `recommendations.functions.ts`, `talent-buckets.ts`.

#### Defect D-06: Unhandled Async Exceptions & Permanent Loading State in `ProfileDialog.tsx`
- **File Path**: `src/components/profiles/ProfileDialog.tsx` (lines 54–94)
- **Execution Chain**: Form Submit -> `save()` -> `setBusy(true)` -> `supabase.from("child_profiles").insert/update` -> `consent_events.insert`
- **Description**: `save()` lacks `try / catch / finally`. If Supabase throws an exception or if `consent_events.insert` throws, `setBusy(false)` is never called and `onSaved()` is bypassed.
- **Impact**: High. Modal button remains disabled in a frozen `busy = true` state. No error message is shown to the user if an unhandled DB exception occurs.
- **Proposed Fix**:
  ```typescript
  const save = async () => {
    setError(null);
    if (!draft.name.trim()) {
      setError("Le prénom est obligatoire");
      return;
    }
    setBusy(true);
    try {
      const payload = { ... };
      if (initial) {
        const { error } = await supabase.from("child_profiles").update(payload).eq("id", initial.id);
        if (error) { setError(error.message); return; }
      } else {
        const { data: created, error } = await supabase.from("child_profiles").insert(payload).select("id").single();
        if (error) { setError(error.message); return; }
        if (created) {
          await supabase.from("consent_events").insert({ ... });
        }
      }
      onSaved();
    } catch (err: any) {
      console.error("Error saving child profile:", err);
      setError(err?.message ?? "Erreur lors de l'enregistrement");
      toast.error(err?.message ?? "Erreur lors de l'enregistrement");
    } finally {
      setBusy(false);
    }
  };
  ```

#### Defect D-07: Unhandled Promise & Missing Error Check in `profiles.index.tsx` Challenges Query
- **File Path**: `src/routes/profiles.index.tsx` (lines 185–199)
- **Execution Chain**: `selectedId` change -> `useEffect` -> `supabase.from("challenges").select(...).then(...)`
- **Description**: `supabase.from("challenges").select(...)` uses `.then(({ data }) => ...)` without checking for `error` or supplying `.catch()`.
- **Impact**: Medium. If DB query fails, `setFetchingChallenges(false)` is skipped or error is ignored silently.
- **Proposed Fix**:
  ```typescript
  supabase
    .from("challenges")
    .select(...)
    .eq("child_id", selectedId)
    .then(({ data, error }) => {
      if (error) {
        console.error("Error fetching challenges:", error);
        toast.error("Erreur lors du chargement des défis");
      }
      setChallenges((data ?? []) as Challenge[]);
    })
    .catch((err) => {
      console.error("Challenges fetch rejected:", err);
      toast.error("Erreur de connexion");
    })
    .finally(() => {
      setFetchingChallenges(false);
    });
  ```

#### Defect D-08: Unhandled LLM Markdown Formatting in `hypotheses.functions.ts`
- **File Path**: `src/lib/hypotheses.functions.ts` (lines 252–256)
- **Execution Chain**: `ensureHypothesesForChild` -> `callClaude` (DeepSeek Reasoner) -> `JSON.parse(raw)`
- **Description**: `JSON.parse(raw)` is called directly on raw output without stripping Markdown code block delimiters (` ```json `). DeepSeek and LLMs often output markdown backticks even when instructed otherwise.
- **Impact**: High. Throws `"Réponse IA invalide (JSON non parsable)"`, breaking hypothesis cycle generation whenever backticks are present in LLM response.
- **Proposed Fix**:
  ```typescript
  let cleanRaw = raw.trim();
  if (cleanRaw.startsWith("```")) {
    cleanRaw = cleanRaw.replace(/^```[a-z]*\n/i, "").replace(/\n```$/i, "").trim();
  }
  parsed = JSON.parse(cleanRaw);
  ```

#### Defect D-09: Silent Error Return in `processDiscriminantResult` Bayesian Update
- **File Path**: `src/lib/hypotheses.functions.ts` (lines 488–494, 565–569)
- **Execution Chain**: `validateChallengeProof` / `submitDeclarativeProof` -> `processDiscriminantResult`
- **Description**: If `pedagogical_context` JSON parsing fails or `supabaseAdmin.from("hypothesis_cycles").update` fails, it logs `console.error` and returns `{ processed: false }` silently.
- **Impact**: Medium. Bayesian probability update fails silently, leaving open hypothesis cycles stagnant without alerting telemetry.
- **Proposed Fix**: Return structured error result `{ processed: false, error: updateErr?.message }` and log to Naya telemetry.

#### Defect D-10: Silent Catch Blocks in Recommendation Engine Functions
- **File Path**: `src/lib/recommendations.functions.ts` (lines 179–181, 274–276)
- **Execution Chain**: `recommendChallengesForChild` -> ESSAIMAGE / STABILISATION generation -> `catch { // Fallback exploration }`
- **Description**: `catch` blocks in `recommendChallengesForChild` silently swallow all errors without logging.
- **Impact**: Low-Medium. Disables debugging visibility for recommendation generation failures.
- **Proposed Fix**: Add `console.error("Recommendation generation failed:", err)` inside catch blocks before returning null/fallback.

---

### User Flow 3: Challenge Generation Engine & Completion
*Routes & Components Audited*: `/profiles/$profileId/challenges`, `OutcomeChat.tsx`, `challenges.functions.ts`, `active-challenge.ts`.

#### Defect D-11: Memory Spike & Server 413 Payload Error on Large Image Uploads in `OutcomeChat.tsx`
- **File Path**: `src/components/challenges/OutcomeChat.tsx` (lines 110–118, 313–338)
- **Execution Chain**: File Select -> `fileToBase64(file)` -> `validateAI({ data: { proofImageBase64 } })`
- **Description**: `fileToBase64` converts any selected image (e.g. 20MB phone photo) directly to a base64 string without checking file size.
- **Impact**: High. Reading large camera photos directly into base64 causes browser memory spikes on mobile devices and triggers HTTP 413 (Payload Too Large) or network timeouts on the server function.
- **Proposed Fix**: Add client-side file size check in `OutcomeChat.tsx`:
  ```typescript
  if (file.size > 5 * 1024 * 1024) {
    toast.error("La photo est trop volumineuse (max 5 Mo). Veuillez en choisir une plus petite.");
    return;
  }
  ```

#### Defect D-12: Unawaited Parent Notes Save before Proof Validation in `OutcomeChat.tsx`
- **File Path**: `src/components/challenges/OutcomeChat.tsx` (lines 107–108)
- **Execution Chain**: `handleValidate()` -> `if (trimmedNotes) onSaveNotes(trimmedNotes);`
- **Description**: `onSaveNotes` triggers `saveNotes` asynchronously without `await`.
- **Impact**: Medium. If `saveNotes` fails on the server, validation continues anyway. The parent assumes their learning journal notes were saved, but they were lost on reload.
- **Proposed Fix**: `if (trimmedNotes) await onSaveNotes(trimmedNotes);` before proceeding to `validateAI`.

#### Defect D-13: Missing Toast Notification on Bulk Challenge Generation Failure
- **File Path**: `src/routes/profiles.$profileId.challenges.tsx` (lines 365–367)
- **Execution Chain**: `handleGenerate()` -> `generate()` -> `catch (e) { setError(...) }`
- **Description**: When `generate` fails, `setError` updates local state, but no Sonner toast is displayed.
- **Impact**: Medium. If the user is scrolled down the page, the top error text is invisible, leaving them unaware why generation failed.
- **Proposed Fix**: Add `toast.error(e instanceof Error ? e.message : "Erreur lors de la génération")` inside `catch`.

#### Defect D-14: Vision Model Fallback Misleading Error Handling in `validateChallengeProof`
- **File Path**: `src/lib/challenges.functions.ts` (lines 1177–1190)
- **Execution Chain**: `validateChallengeProof` -> `callClaude` with vision -> catch -> fallback to text `callClaude`
- **Description**: Non-429 vision errors fall back to text-only `callClaude`, but if text-only `callClaude` fails or returns malformed JSON, the error thrown is raw and uninformative (`"Réponse IA invalide — réessayez dans quelques instants."`).
- **Impact**: Medium. Masking vision model failures behind text-only fallback without logging makes rate-limit vs parsing failures hard to diagnose.
- **Proposed Fix**: Improve error logging and exception messages in `validateChallengeProof`.

#### Defect D-15: Missing Double-Submit Guard on Single Challenge Generation
- **File Path**: `src/routes/profiles.$profileId.challenges.tsx` (lines 184–202)
- **Execution Chain**: Click "Lancer" -> `handleGenerateSingle()`
- **Description**: `handleGenerateSingle` sets `setIsGeneratingSingle(true)` but lacks a guard at the top of the function (`if (isGeneratingSingle) return;`). Rapid double-clicks before React re-renders can trigger duplicate server calls.
- **Impact**: Medium. Duplicate LLM requests sent to DeepSeek/Claude, wasting tokens and creating duplicate challenges.
- **Proposed Fix**: Add `if (isGeneratingSingle) return;` at the beginning of `handleGenerateSingle`.

---

## Verification & Baseline Status

- **TypeScript Compilation**: Executed `npx tsc --noEmit` -> **0 errors**.
- **Test Suite Pass Rate**: Executed `npx vitest run` -> **149 / 149 tests passed** across 11 test files.
