const DeviceType = {
  PC: 'pc',
  MOBILE: 'MOBILE',
}

const SelectStatus = {
  NONE: 'none',
  SELECTING: 'selecting',
  FINISH: 'finish',
}

const MenuType = {
  SELECT: 'select', // 划线
  HIGHLIGHT: 'highlight', // 删除划线
}

// 高亮类型
const HighlightType = {
  UNDERLINE: 'underline', // 底线
  HIGHLIGHT: 'highlight', // 高亮
}

// 标记类型
const MarkingType = {
  UNDERLINE: 'underline', // 划线
  NOTE: 'note', // 笔记
}

export {
  DeviceType,
  SelectStatus,
  MenuType,
  HighlightType,
  MarkingType,
}
