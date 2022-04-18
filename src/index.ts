import { useCallback, useMemo, useState } from "react";
import { isFunction } from "./utils";

type SetStateArg<T> = T | ((state: T) => T);

type UndoableState<T> = {
  timeline: T[];
  index: number;
};

function _newState<T>(timeline: T[], index: number) {
  return {
    timeline,
    index
  };
}

function _canUndoTo<T>(state: UndoableState<T>, to: number) {
  const { index } = state;
  return index > 0 && to < index;
}

function _canRedoTo<T>(state: UndoableState<T>, to: number) {
  const { timeline, index } = state;
  return to < timeline.length && to > index;
}

function _getPast<T>(state: UndoableState<T>) {
  return state.timeline
    .slice(0, state.index)
    .map((timeSlice, index) => ({ timeSlice, index }));
}

function _getFuture<T>(state: UndoableState<T>) {
  return state.timeline
    .slice(state.index + 1, state.timeline.length)
    .map((timeSlice, index) => ({ timeSlice, index: state.index + 1 + index }));
}

function _insert<T>(
  state: UndoableState<T>,
  timeSlice: T,
  maxTimelineSize = 5
) {
  const { timeline, index } = state;
  // keep only past starting from index and making sure the timeline
  // does not grow over maxTimelineSize
  const startIndex = index === maxTimelineSize ? 1 : 0;
  // console.log(startIndex);
  const past = timeline.slice(startIndex, index + 1);
  // add new time slice
  const newTimeline = [...past, timeSlice];
  // increment index to point to new timeSlice
  const newIndex = index === maxTimelineSize ? index : index + 1;
  return _newState(newTimeline, newIndex);
}

function _undoTo<T>(state: UndoableState<T>, to: number) {
  if (!_canUndoTo(state, to)) {
    return state;
  }
  return _newState(state.timeline, to);
}

function _redoTo<T>(state: UndoableState<T>, to: number) {
  if (!_canRedoTo(state, to)) {
    return state;
  }
  return _newState(state.timeline, to);
}

function _jumpTo<T>(state: UndoableState<T>, to: number) {
  const { timeline } = state;
  if (to < 0 || to > timeline.length - 1) {
    return state;
  }
  return _newState(state.timeline, to);
}

function _getCurrentTimeSlice<T>(state: UndoableState<T>) {
  const { timeline, index } = state;
  return timeline[index];
}

function _initState<T>(initialValue: SetStateArg<T>): UndoableState<T> {
  let _initialTimeSlice;
  if (isFunction(initialValue)) {
    _initialTimeSlice = (initialValue as Function)();
  }
  _initialTimeSlice = initialValue as T;
  return _newState([_initialTimeSlice], 0);
}

export default function useTimeline<T>(initialValue: T) {
  const [_state, _setState] = useState(() => _initState(initialValue));

  const setState = useCallback((arg: SetStateArg<T>) => {
    _setState((s) => {
      const timeSlice = _getCurrentTimeSlice(s);

      if (isFunction(arg)) {
        return _insert(s, (arg as Function)(timeSlice));
      }
      return _insert(s, arg);
    });
  }, []);

  const undo = useCallback(() => {
    _setState((s) => {
      const { index } = s;

      return _undoTo(s, index - 1);
    });
  }, []);

  const redo = useCallback(() => {
    _setState((s) => {
      const { index } = s;

      return _redoTo(s, index + 1);
    });
  }, []);

  const jumpTo = useCallback((index: number) => {
    _setState((s) => {
      return _jumpTo(s, index);
    });
  }, []);

  const pastTimeline = useMemo(() => _getPast(_state), [_state]);
  const futureTimeline = useMemo(() => _getFuture(_state), [_state]);

  return {
    // current timeSlice
    state: _getCurrentTimeSlice(_state),
    setState,
    // internal state of the timeline
    internal: {
      ..._state
    },
    // go to previous state
    undo,
    // go to next state
    redo,
    // jump to any timeSlice
    jumpTo,
    // timeline containing past timeSlices
    pastTimeline,
    // timeline containing future timeSlices
    futureTimeline,
    canUndo: _canUndoTo(_state, _state.index - 1),
    canRedo: _canRedoTo(_state, _state.index + 1)
  };
};
