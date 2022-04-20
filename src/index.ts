import { useMemo, useState } from "react";
import { isFunction } from "./utils";

/**
 * Instance returned from useTimeline.
 */
export type TimelineInstance<T> = {
  // current state
  state: T;
  // set new state
  setState: (arg: SetStateArg<T>) => void,
  // internal state of the timeline
  internal: UndoableState<T>,
  // go to previous state
  undo: () => void,
  // go to next state
  redo: () => void,
  // jump to any timeSlice
  jumpTo: (index: number) => void,
  // timeline containing past timeSlices
  pastTimeline: TimeSlice<T>[],
  // timeline containing future timeSlices
  futureTimeline: TimeSlice<T>[],
  // clear the whole timeline keeping the current state
  clearTimeline: () => void;
  // true if can undo
  canUndo: boolean,
  // trye if can redo
  canRedo: boolean
};

export type Options = {
  maxTimelineSize?: number
}

export type UndoableState<T> = {
  timeline: T[];
  index: number;
};

export type TimeSlice<T> = {
  timeSlice: T,
  index: number
}

export type SetStateArg<T> = undefined | T | ((state: T) => T);


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

/**
 * Insert timeSlice, erases future timeSlices, move current timeSlice to past
 */
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

function _clearTimeline<T>(state: UndoableState<T>) {
  const currentTimeSlice = _getCurrentTimeSlice(state);
  return _newState([currentTimeSlice], 0);
}

function _initState<T>(initialValue: SetStateArg<T>): UndoableState<T> {
  let _initialTimeSlice;
  if (isFunction(initialValue)) {
    _initialTimeSlice = (initialValue as Function)();
  }
  _initialTimeSlice = initialValue as T;
  return _newState([_initialTimeSlice], 0);
}

const defaultOptions: Options = {
  maxTimelineSize: 20
}

export function useTimeline<T>(initialValue?: T, options?: Options): TimelineInstance<T> {
  const [_state, _setState] = useState(() => _initState(initialValue));

  const { maxTimelineSize } = {
    ...defaultOptions,
    ...options
  } as Required<Options>;

  const setState = (arg: SetStateArg<T>) => {
    _setState((s) => {
      const timeSlice = _getCurrentTimeSlice(s);

      if (isFunction(arg)) {
        return _insert(s, (arg as Function)(timeSlice), maxTimelineSize);
      }
      return _insert(s, arg, maxTimelineSize);
    });
  }

  const undo = () => {
    _setState((s) => {
      const { index } = s;

      return _undoTo(s, index - 1);
    });
  }

  const redo = () => {
    _setState((s) => {
      const { index } = s;

      return _redoTo(s, index + 1);
    });
  }

  const jumpTo = (index: number) => {
    _setState((s) => {
      return _jumpTo(s, index);
    });
  }

  const clearTimeline = () => {
    _setState((s) => {
      return _clearTimeline(s)
    })
  }

  const pastTimeline = useMemo(() => _getPast(_state), [_state]);
  const futureTimeline = useMemo(() => _getFuture(_state), [_state]);

  return {
    state: _getCurrentTimeSlice(_state),
    setState,
    internal: {
      ..._state
    },
    undo,
    redo,
    jumpTo,
    pastTimeline,
    futureTimeline,
    clearTimeline,
    canUndo: _canUndoTo(_state, _state.index - 1),
    canRedo: _canRedoTo(_state, _state.index + 1)
  };
};
