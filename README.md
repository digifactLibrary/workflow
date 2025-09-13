# Workflow Diagram Manager

Ứng dụng quản lý sơ đồ workflow với React Flow, Node.js và PostgreSQL.

## 🆕 Cập nhật mới: Cơ chế lưu trữ tối ưu

### Thay đổi lớn: Từ JSON sang bảng riêng biệt

**Trước đây**: Tất cả nodes và edges được nhét vào field `data` dạng JSON  
**Hiện tại**: Hệ thống bảng riêng biệt cho objects và connections

#### Lợi ích:
- 🚀 **Performance**: Query nhanh hơn, không cần parse JSON
- 📈 **Scalability**: Dễ mở rộng và thêm metadata
- 📊 **Analytics**: Query trực tiếp patterns, statistics
- 🔧 **Maintainability**: Code rõ ràng, dễ debug

## Cấu trúc Database

### Bảng chính
```sql
-- Bảng quản lý sơ đồ (metadata)
diagrams (id, name, created_at, updated_at, owner_id, data*)

-- Bảng quản lý objects/nodes
diagram_objects (
  id, diagram_id, node_id, node_type,
  position_x, position_y, width, height,
  data, created_at, updated_at
)

-- Bảng quản lý connections/edges  
diagram_connections (
  id, diagram_id, edge_id, 
  source_node_id, target_node_id,
  source_handle, target_handle,
  edge_type, animated, data, style,
  created_at, updated_at
)
```

*`data` field được giữ lại cho backward compatibility

## Cài đặt và Chạy

### 1. Database Setup
```bash
# Tạo PostgreSQL database
createdb workflow_db

# Set environment variables
export PGHOST=localhost
export PGPORT=5432
export PGUSER=postgres
export PGPASSWORD=your_password
export PGDATABASE=workflow_db
```

### 2. Backend
```bash
cd server
npm install
npm start
```

Server sẽ tự động:
- ✅ Tạo tables mới nếu chưa có
- ✅ Migrate dữ liệu cũ sang format mới  
- ✅ Maintain backward compatibility

### 3. Frontend
```bash
npm install
npm run dev
```

## API Endpoints

### Diagram Management (Original)
- `GET /api/diagrams` - Danh sách sơ đồ
- `GET /api/diagrams/:id` - Chi tiết sơ đồ (bao gồm objects + connections)
- `POST /api/diagrams` - Tạo sơ đồ mới
- `PUT /api/diagrams/:id` - Cập nhật sơ đồ
- `DELETE /api/diagrams/:id` - Xóa sơ đồ

### Object Management (New)
- `GET /api/diagrams/:id/objects` - Lấy tất cả objects
- `POST /api/diagrams/:id/objects` - Tạo object mới

### Connection Management (New)  
- `GET /api/diagrams/:id/connections` - Lấy tất cả connections
- `POST /api/diagrams/:id/connections` - Tạo connection mới

## Tính năng

### Authentication
- Login/logout với JWT
- Session management
- User-specific diagrams

### Diagram Editor
- ✅ Drag & drop node creation
- ✅ Visual connection drawing
- ✅ Multiple node types (start, end, decision, process, etc.)
- ✅ Real-time editing
- ✅ Undo/redo functionality
- ✅ Template generation (linear, if-else, parallel)

### Node Types
- **Start/End**: Điểm bắt đầu và kết thúc
- **Process**: Các bước xử lý
- **Decision**: Điều kiện với Yes/No branches
- **Trigger**: Webhook/API triggers  
- **Send**: Gửi messages/notifications
- **Human**: Human tasks với role assignment
- **And/Or**: Logic gates cho parallel processing
- **Comment**: Annotations

### Workspace Management
- ✅ Multiple diagrams per user
- ✅ Dashboard overview
- ✅ Create, rename, duplicate, delete
- ✅ Auto-save functionality
- ✅ Recent diagrams tracking

## Cấu trúc Code

### Frontend (`src/`)
```
├── components/
│   ├── Dashboard.tsx       # Diagram list & management
│   ├── Topbar.tsx         # Navigation & controls  
│   ├── Login.tsx          # Authentication
│   └── ui/                # Reusable UI components
├── flow/
│   ├── types.ts           # Type definitions & utilities
│   ├── palette.tsx        # Node palette/toolbox
│   ├── nodes/             # Custom node components
│   └── edges/             # Custom edge components  
├── state/
│   ├── flowStore.ts       # React Flow state management
│   ├── workspaceStore.ts  # Workspace & diagram management
│   └── authStore.ts       # Authentication state
└── lib/
    └── utils.ts           # Utility functions
```

### Backend (`server/`)
```
└── index.js               # Express server with integrated migration
```

## Migration & Compatibility

### Automatic Migration
Server tự động detect và migrate dữ liệu cũ:

```javascript
// Khi khởi động, server sẽ:
1. Tạo tables mới nếu chưa có
2. Tìm diagrams có data nhưng chưa có objects/connections  
3. Tự động convert sang format mới
4. Maintain backward compatibility
```

### Backward Compatibility
- ✅ API cũ vẫn hoạt động bình thường
- ✅ Field `data` vẫn được sync
- ✅ Frontend cũ vẫn supported
- ✅ Không mất dữ liệu

### Rollback (nếu cần)
```sql
-- Xóa tables mới (backup trước!)
DROP TABLE diagram_connections CASCADE;
DROP TABLE diagram_objects CASCADE;

-- Revert code về commit trước
git checkout previous_commit
```

## Development

### Technology Stack
- **Frontend**: React + TypeScript + Vite
- **UI**: Tailwind CSS + Radix UI
- **Flow Editor**: React Flow (XY Flow)
- **State**: Zustand
- **Backend**: Node.js + Express
- **Database**: PostgreSQL
- **Auth**: JWT + bcrypt

### Environment Variables
```bash
# Database
PGHOST=localhost
PGPORT=5432  
PGUSER=postgres
PGPASSWORD=your_password
PGDATABASE=workflow_db

# Or connection string
DATABASE_URL=postgresql://user:pass@host:port/db

# Security
JWT_SECRET=your-secret-key
NODE_ENV=production
```

### Scripts
```bash
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview build
npm run lint         # ESLint check

cd server
npm start            # Start backend server
```

## Hotkeys

- Ctrl/Cmd+Z: Undo
- Ctrl/Cmd+Y or Ctrl/Cmd+Shift+Z: Redo
- Delete/Backspace: Delete selection

## Examples

### Tạo Object mới
```javascript
const response = await fetch(`/api/diagrams/${diagramId}/objects`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    nodeId: 'start-123',
    nodeType: 'start',
    positionX: 100,
    positionY: 100,
    data: { label: 'Bắt đầu' }
  })
})
```

### Tạo Connection mới
```javascript
const response = await fetch(`/api/diagrams/${diagramId}/connections`, {
  method: 'POST', 
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    edgeId: 'edge-123',
    sourceNodeId: 'start-123',
    targetNodeId: 'process-456',
    edgeType: 'dir',
    animated: true,
    data: { label: 'Tiếp theo' }
  })
})
```

### Query Analytics
```sql
-- Count objects by type
SELECT node_type, COUNT(*) 
FROM diagram_objects 
WHERE diagram_id = 'your-diagram-id'
GROUP BY node_type;

-- Find most connected nodes
SELECT source_node_id, COUNT(*) as outgoing_connections
FROM diagram_connections
WHERE diagram_id = 'your-diagram-id'  
GROUP BY source_node_id
ORDER BY outgoing_connections DESC;
```

## Troubleshooting

### Database Issues
```bash
# Check connection
psql -d workflow_db -c "SELECT version();"

# View tables
psql -d workflow_db -c "\dt"

# Check migration status
psql -d workflow_db -c "SELECT COUNT(*) FROM diagram_objects;"
```

### Performance Monitoring
```sql
-- Check query performance
EXPLAIN ANALYZE SELECT * FROM diagram_objects WHERE diagram_id = 'xxx';

-- View index usage
SELECT schemaname, tablename, indexname, idx_scan
FROM pg_stat_user_indexes
WHERE tablename IN ('diagram_objects', 'diagram_connections');
```

## Contributing

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push branch: `git push origin feature/new-feature`  
5. Tạo Pull Request

## License

MIT License - xem file LICENSE để biết thêm chi tiết.