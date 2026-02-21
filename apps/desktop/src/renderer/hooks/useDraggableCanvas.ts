import { useState, useRef, useCallback } from "react";

/**
 * useDraggableCanvas — 画布平移（Pan）Hook
 *
 * 提供鼠标拖拽平移画布的能力：
 * - 按住左键拖拽 → 整体平移
 * - 双击空白区域 → 重置到原点
 * - 节点卡片上调用 stopPropagation() 可阻止触发画布拖拽
 *
 * 使用方式：
 * ```tsx
 * const { offset, isDragging, handlers, reset } = useDraggableCanvas();
 *
 * <div {...handlers} style={{ cursor: isDragging ? "grabbing" : "grab" }}>
 *   <div style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}>
 *     ...节点和连线...
 *   </div>
 * </div>
 * ```
 */
export function useDraggableCanvas() {
  // 当前平移偏移量（像素）
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  // 是否正在拖拽中（用于切换光标样式）
  const [isDragging, setIsDragging] = useState(false);

  // 拖拽起始点（记录鼠标按下时的坐标 - 当前 offset）
  const startPos = useRef({ x: 0, y: 0 });
  // 标记是否处于拖拽状态（ref 版，避免闭包陈旧问题）
  const draggingRef = useRef(false);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    // 只响应左键（button=0）
    if (e.button !== 0) return;
    e.preventDefault();
    draggingRef.current = true;
    setIsDragging(true);
    // 记录：鼠标位置 - 当前 offset = 拖拽基准点
    startPos.current = {
      x: e.clientX - offset.x,
      y: e.clientY - offset.y,
    };
  }, [offset]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!draggingRef.current) return;
    e.preventDefault();
    setOffset({
      x: e.clientX - startPos.current.x,
      y: e.clientY - startPos.current.y,
    });
  }, []);

  const onMouseUp = useCallback(() => {
    draggingRef.current = false;
    setIsDragging(false);
  }, []);

  // 鼠标离开容器时也要停止拖拽，否则鼠标在容器外松开会"粘住"
  const onMouseLeave = useCallback(() => {
    if (draggingRef.current) {
      draggingRef.current = false;
      setIsDragging(false);
    }
  }, []);

  // 双击重置到原点（方便查看全局视图）
  const onDoubleClick = useCallback((e: React.MouseEvent) => {
    // 只有双击画布空白区域才重置（节点卡片上的双击会被 stopPropagation 拦截）
    e.preventDefault();
    setOffset({ x: 0, y: 0 });
  }, []);

  /** 手动重置偏移量（如切换会话时重置画布视角） */
  const reset = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    draggingRef.current = false;
    setIsDragging(false);
  }, []);

  return {
    offset,
    isDragging,
    /** 绑定到画布外层容器的事件处理器对象 */
    handlers: {
      onMouseDown,
      onMouseMove,
      onMouseUp,
      onMouseLeave,
      onDoubleClick,
    },
    reset,
  };
}
