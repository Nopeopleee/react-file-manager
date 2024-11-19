import React, { useState, useRef } from 'react';
import {
  Paper,
  Typography,
  IconButton,
  Breadcrumbs,
  Link,
  styled,
  Box,
  Card,
  CardContent,
  useTheme,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  Select,
  FormControl,
  InputLabel,
  Button,
  InputAdornment,
} from '@mui/material';
import {
  Folder as FolderIcon,
  InsertDriveFile as FileIcon,
  ViewList as ListIcon,
  GridView as GridIcon,
  NavigateNext as NavigateNextIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Download as DownloadIcon,
  Preview as PreviewIcon,
  Upload as UploadIcon,
} from '@mui/icons-material';

// 自定義樣式組件
const DraggableItem = styled(Card)(({ theme, isDragging, isOver, canDrop }) => ({
  cursor: 'pointer',
  transition: 'all 0.2s',
  transform: isDragging ? 'scale(0.95)' : 'scale(1)',
  opacity: isDragging ? 0.5 : 1,
  backgroundColor: isOver && canDrop ? theme.palette.action.hover : 'inherit',
  '&:hover': {
    backgroundColor: theme.palette.action.hover,
  },
  '& .MuiCardContent-root': {
    '&:last-child': {
      paddingBottom: theme.spacing(2),
    },
  },
}));

const FilePreview = styled(Dialog)(({ theme }) => ({
  '& .MuiDialogContent-root': {
    padding: theme.spacing(2),
    minWidth: 400,
    minHeight: 300,
  },
}));

const FileManager = () => {
  const theme = useTheme();
  const [viewMode, setViewMode] = useState('list');
  const [currentPath, setCurrentPath] = useState(['root']);
  const [draggedItem, setDraggedItem] = useState(null);
  const [dragOverItem, setDragOverItem] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef(null);

  // 擴展檔案系統結構，添加大小和修改日期
  const [fileSystem, setFileSystem] = useState({
    id: 'root',
    name: '根目錄',
    type: 'folder',
    children: [
      {
        id: 'documents',
        name: '文件',
        type: 'folder',
        modifiedDate: new Date('2024-03-15'),
        children: [
          {
            id: 'doc1',
            name: '報告.docx',
            type: 'file',
            size: 1024 * 1024, // 1MB
            modifiedDate: new Date('2024-03-14'),
            content: 'Sample document content'
          },
          {
            id: 'doc2',
            name: '計劃書.pdf',
            type: 'file',
            size: 2.5 * 1024 * 1024, // 2.5MB
            modifiedDate: new Date('2024-03-13'),
            content: 'Sample PDF content'
          }
        ]
      },
      {
        id: 'pictures',
        name: '圖片',
        type: 'folder',
        modifiedDate: new Date('2024-03-12'),
        children: [
          {
            id: 'pic1',
            name: '照片.jpg',
            type: 'file',
            size: 3 * 1024 * 1024, // 3MB
            modifiedDate: new Date('2024-03-11'),
            content: 'Sample image content'
          }
        ]
      },
      {
        id: 'doc3',
        name: '計劃書.pdf',
        type: 'file',
        size: 2.5 * 1024 * 1024, // 2.5MB
        modifiedDate: new Date('2024-03-13'),
        content: 'Sample PDF content'
      }
    ]
  });

  // 文件大小格式化
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 日期格式化
  const formatDate = (date) => {
    return new Date(date).toLocaleString();
  };

  // 處理右鍵選單
  const handleContextMenu = (event, item) => {
    event.preventDefault();
    setSelectedItem(item);
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
    });
  };

  // 關閉右鍵選單
  const handleContextMenuClose = () => {
    setContextMenu(null);
    setSelectedItem(null);
  };

  // 文件排序
  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'folder' ? -1 : 1;
      }

      let comparison = 0;
      switch (sortOption) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = (a.size || 0) - (b.size || 0);
          break;
        case 'date':
          comparison = new Date(a.modifiedDate) - new Date(b.modifiedDate);
          break;
        default:
          comparison = 0;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  };

  // 文件搜索
  const searchFiles = (items, query) => {
    if (!query) return items;

    return items.filter(item => {
      const matchesName = item.name.toLowerCase().includes(query.toLowerCase());
      if (item.type === 'folder') {
        const childMatches = item.children ? searchFiles(item.children, query) : [];
        return matchesName || childMatches.length > 0;
      }
      return matchesName;
    });
  };

  // 處理文件上傳
  const handleFileUpload = (event) => {
    const files = Array.from(event.target.files);
    const currentFolder = getCurrentFolder();

    const newFiles = files.map(file => ({
      id: `file-${Date.now()}-${file.name}`,
      name: file.name,
      type: 'file',
      size: file.size,
      modifiedDate: new Date(),
      content: URL.createObjectURL(file)
    }));

    const updatedFileSystem = { ...fileSystem };
    let current = updatedFileSystem;
    for (let i = 1; i < currentPath.length; i++) {
      current = current.children.find(item => item.id === currentPath[i]);
    }
    current.children = [...(current.children || []), ...newFiles];

    setFileSystem(updatedFileSystem);
    event.target.value = null;
  };

  // 渲染列表項目
  const renderListItem = (item) => (
    <DraggableItem
      key={item.id}
      isDragging={draggedItem?.id === item.id}
      isOver={dragOverItem?.id === item.id}
      canDrop={item.type === 'folder'}
      draggable
      onDragStart={(e) => handleDragStart(e, item)}
      onDragOver={(e) => handleDragOver(e, item)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, item)}
      onClick={() => item.type === 'folder' ? enterFolder(item.id) : handlePreview(item)}
      onContextMenu={(e) => handleContextMenu(e, item)}
      sx={{
        mb: 1,
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing',
        }
      }}
    >
      <CardContent sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: '8px !important'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          {item.type === 'folder' ? (
            <FolderIcon sx={{ color: 'primary.main', mr: 2 }} />
          ) : (
            <FileIcon sx={{ color: 'text.secondary', mr: 2 }} />
          )}
          <Typography>{item.name}</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {item.type === 'file' && (
            <Typography variant="body2" color="text.secondary">
              {formatFileSize(item.size)}
            </Typography>
          )}
          <Typography variant="body2" color="text.secondary">
            {formatDate(item.modifiedDate)}
          </Typography>
        </Box>
      </CardContent>
    </DraggableItem>
  );

  // 渲染網格項目
  const renderGridItem = (item) => (
    <DraggableItem
      key={item.id}
      isDragging={draggedItem?.id === item.id}
      isOver={dragOverItem?.id === item.id}
      canDrop={item.type === 'folder'}
      draggable
      onDragStart={(e) => handleDragStart(e, item)}
      onDragOver={(e) => handleDragOver(e, item)}
      onDragLeave={handleDragLeave}
      onDrop={(e) => handleDrop(e, item)}
      onClick={() => item.type === 'folder' ? enterFolder(item.id) : handlePreview(item)}
      onContextMenu={(e) => handleContextMenu(e, item)}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'grab',
        '&:active': {
          cursor: 'grabbing',
        }
      }}
    >
      <CardContent sx={{ textAlign: 'center', py: '8px !important' }}>
        {item.type === 'folder' ? (
          <FolderIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        ) : (
          <FileIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
        )}
        <Typography noWrap>{item.name}</Typography>
        {item.type === 'file' && (
          <Typography variant="caption" color="text.secondary">
            {formatFileSize(item.size)}
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          {formatDate(item.modifiedDate)}
        </Typography>
      </CardContent>
    </DraggableItem>
  );

  // 處理預覽
  const handlePreview = (item) => {
    if (item.type === 'file') {
      setSelectedItem(item);
      setPreviewOpen(true);
    }
  };

  // 獲取當前資料夾的內容
  const getCurrentFolder = () => {
    let current = fileSystem;
    for (let i = 1; i < currentPath.length; i++) {
      current = current.children.find(item => item.id === currentPath[i]);
    }
    return current;
  };

  // 進入資料夾
  const enterFolder = (folderId) => {
    setCurrentPath(prev => [...prev, folderId]);
  };

  // 導航到指定路徑
  const navigateToPath = (index) => {
    setCurrentPath(prev => prev.slice(0, index + 1));
  };

  // 獲取麵包屑導航資料
  const getBreadcrumbs = () => {
    let current = fileSystem;
    const breadcrumbs = [{ id: 'root', name: fileSystem.name }];

    for (let i = 1; i < currentPath.length; i++) {
      current = current.children.find(item => item.id === currentPath[i]);
      breadcrumbs.push({ id: current.id, name: current.name });
    }
    return breadcrumbs;
  };

  // 移動檔案/資料夾
  const moveItem = (sourceId, targetFolderId) => {
    const newFileSystem = { ...fileSystem };
    let sourceItem = null;
    let sourceParent = null;

    const findItem = (folder, parentFolder) => {
      for (let i = 0; i < folder.children?.length || 0; i++) {
        if (folder.children[i].id === sourceId) {
          sourceItem = folder.children[i];
          sourceParent = folder;
          folder.children.splice(i, 1);
          return true;
        }
        if (folder.children[i].type === 'folder') {
          if (findItem(folder.children[i], folder)) {
            return true;
          }
        }
      }
      return false;
    };

    const addToTarget = (folder) => {
      if (folder.id === targetFolderId) {
        if (!folder.children) folder.children = [];
        folder.children.push(sourceItem);
        return true;
      }
      for (const child of folder.children || []) {
        if (child.type === 'folder' && addToTarget(child)) {
          return true;
        }
      }
      return false;
    };

    findItem(newFileSystem);
    if (sourceItem && targetFolderId !== sourceParent.id) {
      addToTarget(newFileSystem);
      setFileSystem(newFileSystem);
    }
  };

  // 拖曳相關處理函數
  const handleDragStart = (e, item) => {
    setDraggedItem(item);
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, item) => {
    e.preventDefault();
    e.stopPropagation();
    if (item.type === 'folder' && item.id !== draggedItem?.id) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverItem(item);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);
  };

  const handleDrop = (e, targetFolder) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverItem(null);
    if (draggedItem && targetFolder.type === 'folder' && draggedItem.id !== targetFolder.id) {
      moveItem(draggedItem.id, targetFolder.id);
    }
    setDraggedItem(null);
  };

  // 右鍵選單選項處理
  const handleMenuAction = (action) => {
    switch (action) {
      case 'delete':
        // 實現刪除功能
        break;
      case 'rename':
        // 實現重新命名功能
        break;
      case 'download':
        // 實現下載功能
        break;
      case 'preview':
        handlePreview(selectedItem);
        break;
      default:
        break;
    }
    handleContextMenuClose();
  };


  return (
    <Paper elevation={2} sx={{ p: 2 }}>
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" component="h1">
          {getCurrentFolder().name}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {/* 搜索框 */}
          <TextField
            size="small"
            placeholder="搜索文件..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          {/* 排序選擇器 */}
          <FormControl size="small">
            <Select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              displayEmpty
              startAdornment={
                <IconButton size="small" onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}>
                  <SortIcon sx={{ transform: sortDirection === 'desc' ? 'rotate(180deg)' : 'none' }} />
                </IconButton>
              }
            >
              <MenuItem value="name">名稱</MenuItem>
              <MenuItem value="size">大小</MenuItem>
              <MenuItem value="date">日期</MenuItem>
            </Select>
          </FormControl>

          {/* 視圖切換 */}
          <IconButton
            onClick={() => setViewMode('list')}
            color={viewMode === 'list' ? 'primary' : 'default'}
          >
            <ListIcon />
          </IconButton>
          <IconButton
            onClick={() => setViewMode('grid')}
            color={viewMode === 'grid' ? 'primary' : 'default'}
          >
            <GridIcon />
          </IconButton>

          {/* 上傳按鈕 */}
          <input
            type="file"
            multiple
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          <Button
            variant="contained"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
          >
            上傳
          </Button>
        </Box>
      </Box>

      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 2 }}
      >
        {getBreadcrumbs().map((item, index) => (
          <Link
            key={item.id}
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => navigateToPath(index)}
          >
            {item.name}
          </Link>
        ))}
      </Breadcrumbs>

      <Box sx={viewMode === 'grid' ? {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 2
      } : {}}>
        {sortItems(searchFiles(getCurrentFolder().children || [], searchQuery))
          .map(item => viewMode === 'list' ? renderListItem(item) : renderGridItem(item))}
      </Box>

      {/* 右鍵選單 */}
      <Menu
        open={contextMenu !== null}
        onClose={handleContextMenuClose}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => handleMenuAction('preview')} disabled={selectedItem?.type !== 'file'}>
          <PreviewIcon sx={{ mr: 1 }} /> 預覽
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('download')} disabled={selectedItem?.type !== 'file'}>
          <DownloadIcon sx={{ mr: 1 }} /> 下載
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('rename')}>
          <EditIcon sx={{ mr: 1 }} /> 重新命名
        </MenuItem>
        <MenuItem onClick={() => handleMenuAction('delete')}>
          <DeleteIcon sx={{ mr: 1 }} /> 刪除
        </MenuItem>
      </Menu>

      {/* 檔案預覽對話框 */}
      <FilePreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
      >
        <DialogTitle>{selectedItem?.name}</DialogTitle>
        <DialogContent>
          {selectedItem?.content && (
            <Box sx={{ maxWidth: '100%', overflow: 'auto' }}>
              {selectedItem.name.endsWith('.jpg') || selectedItem.name.endsWith('.png') ? (
                <img src={selectedItem.content} alt={selectedItem.name} style={{ maxWidth: '100%' }} />
              ) : (
                <Typography>{selectedItem.content}</Typography>
              )}
            </Box>
          )}
        </DialogContent>
      </FilePreview>
    </Paper>
  );
};

export default FileManager;