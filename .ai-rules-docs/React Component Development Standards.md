# React Component Development Standards

## Component Structure

- **File Naming:** Use PascalCase (e.g., `UserProfile.tsx`). Colocate styles/tests if applicable.
- **Exports:** Use named exports primarily. Default exports for page components if necessary.
- **Props:** Define props using TypeScript interfaces (e.g., `interface UserProfileProps { ... }`). Place interface definition directly above the component.
- **Hooks:** Call hooks at the top level of the component, before any conditional logic or return statements.
- **Imports:** Order imports: React -> external libraries -> internal modules/components -> assets/styles.

## State Management

- **Simple State:** Use `useState` for simple, local component state.
- **Complex State/Logic:** Consider `useReducer` for state transitions involving multiple sub-values or complex logic.
- **Shared State:** For state shared across multiple components, use Context API for simple cases or a dedicated state management library (e.g., Zustand, Redux Toolkit) for more complex applications. Avoid prop drilling excessively.

## Styling

- Primarily use Tailwind CSS utility classes via the `className` prop.
- For dynamic styles based on props or state, use libraries like `clsx` or `cva`.
- Avoid inline styles unless absolutely necessary for dynamic values that cannot be represented by utilities.

## Examples

```typescript
// Example Structure
import React, { useState } from 'react';
import { fetchUserData } from '../utils/api'; // Internal module
import styles from './UserProfile.module.css'; // CSS Module (if not using Tailwind exclusively)

interface UserProfileProps {
  userId: string;
}

export const UserProfile: React.FC<UserProfileProps> = ({ userId }) => {
  const [userData, setUserData] = useState(null);
  // ... other hooks

  // Effects and handlers...

  return (
    <div className="p-4 border rounded"> {/* Tailwind example */}
      {/* ... component JSX */}
    </div>
  );
};
```

## Attached References
- `@StyleGuide.md` (Link to a more comprehensive style guide if available)
