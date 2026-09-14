// ============================================
// DOM ELEMENTS
// ============================================
const $ = (id) => document.getElementById(id);
const $$ = (sel) => document.querySelectorAll(sel);

const els = {
  board: $('board'),
  boardSvg: $('boardSvg'),
  boardContainer: $('boardContainer'),
  boardArea: $('boardArea'),
  layout: $('layout'),
  topbar: $('topbar'),
  movesList: $('movesList'),
  fenInput: $('fenInput'),
  puzzleOverlay: $('puzzleOverlay'),
  puzzleQuestion: $('puzzleQuestion'),
  puzzleAnswer: $('puzzleAnswer'),
  puzzleAnswerMove: $('puzzleAnswerMove'),
  toast: $('toast'),
};

