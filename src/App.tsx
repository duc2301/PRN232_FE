import { useState, useCallback, useEffect } from 'react';
import { Button, Input, Table, Select, message } from 'antd';
import { FolderOpen, PlayCircle, RefreshCw, CheckCircle2, XCircle, Clock, Search } from 'lucide-react';
import axiosInstance from './lib/axiosInstance';

interface ScoreResult {
  studentId: number;
  studentName: string;
  projectFolder: string;
  score: number;
  points: number;
  status: string;
}

interface FetchParams {
  page?: number;
  pageSize?: number;
  searchName?: string;
  statusList?: string[];
}

const STATUS_OPTIONS = [
  { label: 'Passed', value: 'Passed' },
  { label: 'Build Failed', value: 'BuildFailed' },
];

export default function App() {
  const [folderPath, setFolderPath] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScoreResult[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [searchName, setSearchName] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const fetchResults = useCallback(async (params: FetchParams = {}) => {
    try {
      setLoading(true);
      const resolvedPage = params.page ?? page;
      const resolvedPageSize = params.pageSize ?? pageSize;
      const resolvedSearch = params.searchName ?? searchName;
      const resolvedStatus = params.statusList ?? statusFilter;

      const searchParams = new URLSearchParams();
      searchParams.set('Page', String(resolvedPage));
      searchParams.set('PageSize', String(resolvedPageSize));
      if (resolvedSearch) searchParams.set('SearchName', resolvedSearch);
      resolvedStatus.forEach(s => searchParams.append('StatusList', s));

      const res = await axiosInstance.get(`/api/folders?${searchParams.toString()}`);
      setResults(res.data.data.items);
      setTotalItems(res.data.data.totalItems);
    } catch {
      message.error('Lỗi khi lấy dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchName, statusFilter]);

  useEffect(() => {
    fetchResults();
  }, []);

  const handleGetFolders = async () => {
    if (!folderPath) {
      message.warning('Vui lòng nhập đường dẫn folder!');
      return;
    }
    try {
      setLoading(true);
      await axiosInstance.post('/api/get-folders', { projectFolder: folderPath });
      message.success('Đã nạp danh sách thư mục thành công');
      await fetchResults({ page: 1 });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi gọi API get-folders');
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async () => {
    try {
      setLoading(true);
      await axiosInstance.post('/api/grade/all-directory');
      message.success('Đã chạy quá trình chấm bài');
      setPage(1);
      await fetchResults({ page: 1 });
    } catch (err: any) {
      message.error(err.response?.data?.message || 'Lỗi khi chấm bài');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchName(value);
    setPage(1);
    fetchResults({ searchName: value, page: 1, statusList: statusFilter });
  };

  const handleStatusFilter = (values: string[]) => {
    setStatusFilter(values);
    setPage(1);
    fetchResults({ statusList: values, page: 1, searchName });
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
    fetchResults({ page: pagination.current });
  };

  const passed = results.filter(r => r.status === 'Passed').length;
  const failed = results.filter(r => r.status !== 'Passed').length;

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 52,
      render: (_: any, __: any, index: number) => (
        <span className="text-slate-400 text-sm">{(page - 1) * pageSize + index + 1}</span>
      ),
    },
    {
      title: 'Sinh viên / MSSV',
      dataIndex: 'studentName',
      key: 'studentName',
      render: (text: string) => (
        <span className="font-medium text-slate-700 text-sm">{text}</span>
      ),
    },
    {
      title: 'Điểm',
      dataIndex: 'score',
      key: 'score',
      width: 90,
      render: (score: number) => (
        <span className={`font-bold text-sm ${score >= 50 ? 'text-emerald-600' : 'text-red-500'}`}>
          {score}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => {
        if (status === 'Passed') {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
              <CheckCircle2 size={12} /> Passed
            </span>
          );
        }
        if (status === 'BuildFailed') {
          return (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded-md">
              <XCircle size={12} /> Build Failed
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-md">
            <Clock size={12} /> {status}
          </span>
        );
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-slate-700 rounded flex items-center justify-center">
              <CheckCircle2 size={15} className="text-slate-200" />
            </div>
            <span className="font-semibold text-base tracking-tight">GradeHub</span>
            <span className="text-slate-500 text-sm hidden sm:inline">/ Auto Grader</span>
          </div>
          <span className="text-slate-400 text-xs">{import.meta.env.VITE_API_BASE_URL}</span>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {/* Page title */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-slate-800 m-0">Chấm điểm tự động</h1>
          <p className="text-slate-500 text-sm mt-1 m-0">Build và chạy test case trên bài nộp của sinh viên</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left panel */}
          <div className="lg:col-span-1 flex flex-col gap-4">
            {/* Folder config */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-sm font-medium text-slate-700 mb-3 m-0">Thư mục bài nộp</p>
              <div className="flex flex-col gap-3">
                <Input
                  placeholder="Ví dụ: D:\submissions"
                  value={folderPath}
                  onChange={e => setFolderPath(e.target.value)}
                  onPressEnter={handleGetFolders}
                  prefix={<FolderOpen size={15} className="text-slate-400" />}
                  size="middle"
                  className="rounded-md border-slate-300 text-sm"
                />
                <Button
                  onClick={handleGetFolders}
                  loading={loading}
                  className="w-full border-slate-300 text-slate-700 hover:border-slate-500! hover:text-slate-900! rounded-md text-sm h-9"
                >
                  Nạp danh sách
                </Button>
              </div>
            </div>

            {/* Grade action */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-sm font-medium text-slate-700 mb-1 m-0">Thực thi chấm bài</p>
              <p className="text-xs text-slate-400 mb-4 m-0">Build và chạy toàn bộ bài nộp đã nạp</p>
              <Button
                type="primary"
                size="middle"
                onClick={handleGrade}
                loading={loading}
                icon={<PlayCircle size={15} />}
                className="w-full bg-slate-800 hover:bg-slate-700! border-0 rounded-md text-sm h-9 font-medium flex items-center justify-center gap-2"
              >
                Bắt đầu chấm bài
              </Button>
            </div>

            {/* Stats */}
            {totalItems > 0 && (
              <div className="bg-white border border-slate-200 rounded-lg p-5">
                <p className="text-sm font-medium text-slate-700 mb-3 m-0">Thống kê</p>
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Tổng bài</span>
                    <span className="font-semibold text-slate-800">{totalItems}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Đạt (trang này)</span>
                    <span className="font-semibold text-emerald-600">{passed}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Không đạt (trang này)</span>
                    <span className="font-semibold text-red-500">{failed}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${results.length ? (passed / results.length) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-slate-400 text-right m-0">
                    {results.length ? Math.round((passed / results.length) * 100) : 0}% đạt trang này
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right panel - Table */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden h-full flex flex-col">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-slate-700">Bảng điểm</span>
                    {totalItems > 0 && (
                      <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                        {totalItems} bài
                      </span>
                    )}
                  </div>
                  <Button
                    size="small"
                    onClick={() => fetchResults()}
                    loading={loading}
                    icon={<RefreshCw size={13} />}
                    className="border-slate-200 text-slate-500 hover:border-slate-400! hover:text-slate-700! rounded text-xs flex items-center gap-1"
                  >
                    Làm mới
                  </Button>
                </div>

                {/* Search & Filter */}
                <div className="flex gap-2">
                  <Input.Search
                    placeholder="Tìm theo tên sinh viên..."
                    allowClear
                    size="small"
                    prefix={<Search size={13} className="text-slate-400" />}
                    onSearch={handleSearch}
                    className="flex-1 text-sm"
                  />
                  <Select
                    mode="multiple"
                    placeholder="Trạng thái"
                    options={STATUS_OPTIONS}
                    onChange={handleStatusFilter}
                    size="small"
                    className="min-w-36"
                    maxTagCount="responsive"
                    allowClear
                  />
                </div>
              </div>

              <Table
                dataSource={results}
                columns={columns}
                rowKey="studentId"
                size="small"
                loading={loading}
                onChange={handleTableChange}
                pagination={{
                  current: page,
                  pageSize,
                  total: totalItems,
                  showSizeChanger: false,
                  showTotal: (total) => `Tổng ${total} bài`,
                }}
                locale={{ emptyText: <div className="py-12 text-slate-400 text-sm">Chưa có dữ liệu — hãy nạp thư mục và chấm bài</div> }}
                className="[&_.ant-table-thead_th]:bg-slate-50 [&_.ant-table-thead_th]:text-slate-500 [&_.ant-table-thead_th]:font-medium [&_.ant-table-thead_th]:text-xs [&_.ant-table-row:hover_td]:bg-slate-50 [&_.ant-table-tbody_td]:py-2.5"
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
