# Security Specification for AI Studio Firebase Architecture

## 1. Data Invariants
1. A user can only read, write, create, update, or delete documents where `request.auth.uid == userId`.
2. All path variable IDs must be alphanumeric strings bounded by `isValidId()` (size <= 128).
3. Creations and Chat threads are subcollections directly keyed to `/users/{userId}`, ensuring strictly partitioned zero-trust multitenancy.
4. User profile documents cannot be created or modified with an identity other than `request.auth.uid`.
5. No unauthenticated user can read or write any user records or creations.
6. A default deny-all catch-all rule protects the entire database root.

## 2. The Dirty Dozen Payloads (Designed to be blocked)
1. Unauthenticated read to `/users/alice`: `request.auth == null` -> DENIED
2. Unauthenticated write to `/users/alice`: `request.auth == null` -> DENIED
3. Spoofed user write: User Bob (`request.auth.uid == 'bob'`) writing to `/users/alice` -> DENIED
4. Creation hijack: User Bob writing to `/users/alice/creations/item1` -> DENIED
5. Chat thread tamper: User Bob reading `/users/alice/chats/chat1` -> DENIED
6. Chat message injection: User Bob posting to `/users/alice/chats/chat1/messages/msg1` -> DENIED
7. Path traversal/ID poisoning: Writing to ID `../root` with invalid characters -> DENIED
8. Oversized payload write: Writing strings > 500KB into document fields -> DENIED
9. Shadow field injection: Creating a creation with unauthorized unexpected keys -> DENIED
10. Anonymous user reading global documents: `match /{document=**}` -> DENIED
11. Missing required field in Creation: Creating a creation without `type` or `title` -> DENIED
12. Identity mutation: Updating a creation to transfer ownership `userId` from Alice to Bob -> DENIED
