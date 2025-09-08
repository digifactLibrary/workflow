# XYFlow (React Flow) DX Starter

What’s inside

- React + Vite + TypeScript
- TailwindCSS + shadcn‑style UI primitives (Button, Tooltip, Switch)
- XYFlow (@xyflow/react) with custom nodes + animated directional edges
- DnD palette, node toolbar, resizer, hotkeys, autosave (localStorage), undo/redo, export/import
- Dashboard quản lý nhiều sơ đồ (tạo/mở/đổi tên/nhân đôi/xoá)

Getting started

- Install deps: `npm install`
- Start dev server: `npm run dev`

Hotkeys

- Ctrl/Cmd+Z: Undo
- Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z: Redo
- Delete/Backspace: Delete selection

Usage notes

- Drag node types from the left palette onto the canvas.
- Connect nodes by dragging from any handle; edges auto‑choose best sides and animate from source to target with an arrow.
- Click a node to see the inline toolbar (duplicate/delete) and resizer. Double‑click label in your own project to edit.
- Export/Import buttons save/load the diagram as JSON.

Dashboard (quản lý nhiều sơ đồ)

- Mở Dashboard: nút "Sơ đồ" ở thanh trên cùng.
- Tạo mới: bấm "Sơ đồ mới" để tạo và mở ngay.
- Mở: bấm "Mở" trên thẻ sơ đồ để vào trình biên tập.
- Đổi tên/Nhân đôi/Xoá: các nút tương ứng trên từng thẻ.
- Autosave: khi bật, thay đổi trên canvas được lưu vào sơ đồ đang mở.
