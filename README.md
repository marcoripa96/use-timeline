# useTimeline

An enchanced useState hook which keeps track of the states history, allowing you to undo and redo states.

---

**useTimeline** is a simple hook based on the **useState** hook which abstracts operations of undo and redo.

A full example is avaiable on [here](https://codesandbox.io/s/blissful-framework-xqwyli?file=/src/App.tsx:300-401).

## Quick Start

```tsx
import { useTimeline } from '@mr96/useTimeline';

export default function App() {
  const {
    // current state
    state,
    // set a new state (same API as setState)
    setState,
    // undo by 1 step
    undo,
    // redo by 1 step
    redo,
    // true if there is an undoable state
    canUndo,
    // true if there is a redoable state
    canRedo,
    ...additionalProps
  } = useTimeline('');

  const onChange = (event: ChangeEvent<HTMLInputElement>) => {
    setState(event.target.value);
  };

  return (
    <button disabled={!canUndo} onClick={() => undo()}>
      Undo
    </button>
    <input type="text" onChange={onChange} value={state} />
    <button disabled={!canRedo} onClick={() => redo()}>
      Redo
    </button>
  )
}
```
