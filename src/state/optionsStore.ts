import { create } from 'zustand';
import { fetchNodeOptions, type NodeOptions } from '../lib/api';

type OptionsState = {
  isLoading: boolean;
  error: string | null;
  lastUpdated: number | null;
  options: NodeOptions | null;
  fetchOptions: () => Promise<void>;
  fetchingRef: { current: boolean };
};

const defaultOptions: NodeOptions = {
  triggerEventOptions: [
    { id: 'default_1', value: 'tạo mới', label: 'Tạo mới', icon: 'PlusCircle' },
    { id: 'default_2', value: 'chỉnh sửa', label: 'Chỉnh sửa', icon: 'Pencil' },
    { id: 'default_3', value: 'xóa', label: 'Xóa', icon: 'Trash2' },
    { id: 'default_4', value: 'lưu trữ', label: 'Lưu trữ', icon: 'Archive' },
    { id: 'default_5', value: 'hủy lưu trữ', label: 'Hủy lưu trữ', icon: 'ArchiveRestore' },
    { id: 'default_6', value: 'phê duyệt', label: 'Phê duyệt', icon: 'CheckCircle2' },
    { id: 'default_7', value: 'từ chối phê duyệt', label: 'Từ chối phê duyệt', icon: 'XCircle' },
  ],
  triggerModuleOptions: [
    { id: 'default_1', value: 'order_mgmt', label: 'Quản lý đơn hàng' },
    { id: 'default_2', value: 'quote_new', label: 'Lên báo giá mới' },
    { id: 'default_3', value: 'quote_list', label: 'Danh sách báo giá' },
    { id: 'default_4', value: 'customer_list', label: 'Danh sách khách hàng' },
    { id: 'default_5', value: 'order_list', label: 'Danh sách đơn hàng' },
  ],
  sendKindOptions: [
    { id: 'default_1', value: 'Email', label: 'Email', icon: 'Mail' },
    { id: 'default_2', value: 'Notification', label: 'Notification in app', icon: 'Bell' },
    { id: 'default_3', value: 'ChatApp', label: 'ChatApp', icon: 'MessageSquareText' },
  ],
  humanPersonTypeOptions: [
    { id: 'type_1', value: 'personal', label: 'Cá nhân' },
    { id: 'type_2', value: 'role', label: 'Chức danh' },
  ],
  humanPeopleOptions: [
    { id: 'default_1', value: 'user1', label: 'Nguyễn Minh Khoa' },
    { id: 'default_2', value: 'user2', label: 'Trần Thị Thu Hà' },
    { id: 'default_3', value: 'user3', label: 'Lê Anh Tuấn' },
  ],
  humanRoleOptions: [
    { id: 'default_1', value: 'lead', label: 'Lead' },
    { id: 'default_2', value: 'president', label: 'President' },
    { id: 'default_3', value: 'engineer', label: 'Software Engineer' },
    { id: 'default_4', value: 'pm', label: 'Product Manager' },
  ],
  humanDepartmentOptions: [
    { id: 'default_1', value: 'eng', label: 'Kỹ thuật (Engineering)' },
    { id: 'default_2', value: 'product', label: 'Quản lý Sản phẩm (Product Management)' },
  ],
};

// Tạo một đối tượng để theo dõi trạng thái fetch bên ngoài store
// Điều này giúp tránh trigger re-render khi kiểm tra trạng thái
const fetchingState = { current: false };

// Tạo hàm để thực hiện fetch options, được tách riêng khỏi store để tránh vấn đề với re-render
let fetchPromise: Promise<void> | null = null;

// Lưu trữ dữ liệu options ở phạm vi module để có thể so sánh trước khi cập nhật store
let currentOptions: NodeOptions | null = defaultOptions;

// Hàm thực sự fetch options từ API
async function fetchOptionsFromApi(): Promise<void> {
  if (fetchingState.current) {
    return fetchPromise || Promise.resolve();
  }
  
  fetchingState.current = true;
  
  // Tạo một promise mới cho lần fetch này
  fetchPromise = new Promise<void>(async (resolve) => {
    try {
      const options = await fetchNodeOptions();
      
      // Chỉ cập nhật store nếu cần thiết
      if (JSON.stringify(currentOptions) !== JSON.stringify(options)) {
        currentOptions = options;
        useOptionsStore.setState({
          options,
          isLoading: false,
          lastUpdated: Date.now(),
          error: null
        });
      } else {
        useOptionsStore.setState({
          isLoading: false,
          lastUpdated: Date.now(),
        });
      }
    } catch (error) {
      console.error('Failed to fetch options:', error);
      useOptionsStore.setState({
        error: error instanceof Error ? error.message : 'Unknown error',
        isLoading: false
      });
    } finally {
      fetchingState.current = false;
      fetchPromise = null;
      resolve();
    }
  });
  
  return fetchPromise;
}

export const useOptionsStore = create<OptionsState>()(() => ({
  isLoading: false,
  error: null,
  lastUpdated: null,
  options: defaultOptions,
  fetchingRef: fetchingState,
  
  // Chỉ đóng vai trò là một wrapper cho hàm thực sự bên ngoài
  fetchOptions: async () => {
    // Đánh dấu đang loading nhưng không đợi cập nhật state
    if (!fetchingState.current) {
      useOptionsStore.setState({ isLoading: true, error: null });
    }
    return fetchOptionsFromApi();
  },
}));