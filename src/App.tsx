import { useState, useCallback, useEffect } from "react";
import {
  Button,
  Input,
  Table,
  Select,
  message,
  Modal,
  Descriptions,
  Popconfirm,
  Tooltip,
  Tag,
  Spin,
} from "antd";
import {
  FolderOpen,
  PlayCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Eye,
  Trash2,
  Pencil,
  Zap,
  Activity,
  BarChart3,
  ArrowUpDown,
  AlertTriangle,
  Timer,
} from "lucide-react";
import axiosInstance from "./lib/axiosInstance";

/* ───────── Types ───────── */
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
  sortOption?: string;
}

/* ───────── Constants ───────── */
const STATUS_OPTIONS = [
  { label: "Passed", value: "Passed" },
  { label: "Failed", value: "Failed" },
  { label: "Build Failed", value: "BuildFailed" },
  { label: "Startup Timeout", value: "StartupTimeout" },
  { label: "Exception", value: "Exception" },
];

const SORT_OPTIONS = [
  { label: "Score ↑ (Low to High)", value: "asc" },
  { label: "Score ↓ (High to Low)", value: "desc" },
];

/* ───────── App ───────── */
export default function App() {
  /* State — list & filters */
  const [folderPath, setFolderPath] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ScoreResult[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(4);
  const [searchName, setSearchName] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [sortOption, setSortOption] = useState<string | undefined>(undefined);

  /* State — detail modal */
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<ScoreResult | null>(null);

  /* State — edit path modal */
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [editPath, setEditPath] = useState("");

  /* State — grade single */
  const [gradingSingleId, setGradingSingleId] = useState<number | null>(null);

  /* ───── API: GET /api/folders (paginated list) ───── */
  const fetchResults = useCallback(
    async (params: FetchParams = {}) => {
      try {
        setLoading(true);
        const resolvedPage = params.page ?? page;
        const resolvedPageSize = params.pageSize ?? pageSize;
        const resolvedSearch = params.searchName ?? searchName;
        const resolvedStatus = params.statusList ?? statusFilter;
        const resolvedSort = params.sortOption ?? sortOption;

        const searchParams = new URLSearchParams();
        searchParams.set("Page", String(resolvedPage));
        searchParams.set("PageSize", String(resolvedPageSize));
        if (resolvedSearch) searchParams.set("SearchName", resolvedSearch);
        if (resolvedSort) searchParams.set("SortOption", resolvedSort);
        resolvedStatus.forEach((s) => searchParams.append("StatusList", s));

        const res = await axiosInstance.get(
          `/api/folders?${searchParams.toString()}`
        );
        setResults(res.data.data.items);
        setTotalItems(res.data.data.totalItems);
      } catch {
        message.error("Failed to fetch submissions");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize, searchName, statusFilter, sortOption]
  );

  useEffect(() => {
    fetchResults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ───── API: POST /api/folders (scan directory) ───── */
  const handleGetFolders = async () => {
    if (!folderPath) {
      message.warning("Please enter a submissions folder path!");
      return;
    }
    try {
      setLoading(true);
      await axiosInstance.post("/api/folders", { projectFolder: folderPath });
      message.success("Directory scanned successfully");
      setPage(1);
      await fetchResults({ page: 1 });
    } catch (err: any) {
      message.error(
        err.response?.data?.message || "Error scanning directory"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ───── API: POST /api/students/all-directory (grade all) ───── */
  const handleGradeAll = async () => {
    try {
      setLoading(true);
      await axiosInstance.post("/api/students/all-directory");
      message.success("All submissions graded successfully");
      setPage(1);
      await fetchResults({ page: 1 });
    } catch (err: any) {
      message.error(err.response?.data?.message || "Error grading submissions");
    } finally {
      setLoading(false);
    }
  };

  /* ───── API: POST /api/students/single-directory/:id (grade single) ───── */
  const handleGradeSingle = async (record: ScoreResult) => {
    try {
      setGradingSingleId(record.studentId);
      await axiosInstance.post(`/api/students/single-directory/${record.studentId}`);
      message.success(`Graded "${record.studentName}" successfully`);
      await fetchResults();
    } catch (err: any) {
      message.error(
        err.response?.data?.message || "Error grading this submission"
      );
    } finally {
      setGradingSingleId(null);
    }
  };

  /* ───── API: GET /api/folders/:id (detail) ───── */
  const handleViewDetail = async (id: number) => {
    try {
      setDetailOpen(true);
      setDetailLoading(true);
      const res = await axiosInstance.get(`/api/folders/${id}`);
      setDetailRecord(res.data.data ?? res.data);
    } catch (err: any) {
      message.error(
        err.response?.data?.message || "Error fetching submission details"
      );
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  /* ───── API: PUT /api/folders/:id/path (update path) ───── */
  const handleOpenEdit = (record: ScoreResult) => {
    setEditId(record.studentId);
    setEditPath(record.projectFolder || "");
    setEditOpen(true);
  };

  const handleSavePath = async () => {
    if (editId === null) return;
    if (!editPath.trim()) {
      message.warning("Please enter a folder path");
      return;
    }
    try {
      setEditLoading(true);
      await axiosInstance.put(`/api/folders/${editId}/path`, {
        projectFolder: editPath,
      });
      message.success("Folder path updated");
      setEditOpen(false);
      await fetchResults();
    } catch (err: any) {
      message.error(
        err.response?.data?.message || "Error updating folder path"
      );
    } finally {
      setEditLoading(false);
    }
  };

  /* ───── API: DELETE /api/folders/:id ───── */
  const handleDelete = async (id: number) => {
    try {
      setLoading(true);
      await axiosInstance.delete(`/api/folders/${id}`);
      message.success("Submission deleted");
      await fetchResults();
    } catch (err: any) {
      message.error(
        err.response?.data?.message || "Error deleting submission"
      );
    } finally {
      setLoading(false);
    }
  };

  /* ───── Handlers: search, filter, sort, pagination ───── */
  const handleSearch = (value: string) => {
    setSearchName(value);
    setPage(1);
    fetchResults({ searchName: value, page: 1, statusList: statusFilter, sortOption });
  };

  const handleStatusFilter = (values: string[]) => {
    setStatusFilter(values);
    setPage(1);
    fetchResults({ statusList: values, page: 1, searchName, sortOption });
  };

  const handleSortChange = (value: string | undefined) => {
    setSortOption(value);
    setPage(1);
    fetchResults({ sortOption: value, page: 1, searchName, statusList: statusFilter });
  };

  const handleTableChange = (pagination: any) => {
    setPage(pagination.current);
    fetchResults({ page: pagination.current });
  };

  /* ───── Computed stats ───── */
  const passed = results.filter((r) => r.status === "Passed").length;
  const failed = results.filter((r) => r.status !== "Passed").length;
  const passRate = results.length
    ? Math.round((passed / results.length) * 100)
    : 0;

  /* ───── Column definitions ───── */
  const columns = [
    {
      title: "#",
      key: "index",
      width: 52,
      render: (_: any, __: any, index: number) => (
        <span className="text-slate-400 text-xs font-mono">
          {(page - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      title: "Student",
      dataIndex: "studentName",
      key: "studentName",
      render: (text: string) => (
        <span className="font-medium text-slate-700 text-sm">{text}</span>
      ),
    },
    {
      title: "Score",
      dataIndex: "score",
      key: "score",
      width: 80,
      render: (score: number) => (
        <span
          className={`font-bold text-sm tabular-nums ${score >= 50 ? "text-emerald-600" : "text-red-500"
            }`}
        >
          {score}
        </span>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      width: 130,
      render: (status: string) => {
        const tagClass = "flex items-center gap-1 w-fit text-xs font-medium px-2 py-0.5 rounded-md border-0";
        switch (status) {
          case "Passed":
            return (
              <Tag color="success" className={tagClass}>
                <CheckCircle2 size={11} /> Passed
              </Tag>
            );
          case "Failed":
            return (
              <Tag color="orange" className={tagClass}>
                <XCircle size={11} /> Failed
              </Tag>
            );
          case "BuildFailed":
            return (
              <Tag color="error" className={tagClass}>
                <XCircle size={11} /> Build Failed
              </Tag>
            );
          case "StartupTimeout":
            return (
              <Tag color="warning" className={tagClass}>
                <Timer size={11} /> Startup Timeout
              </Tag>
            );
          case "Exception":
            return (
              <Tag color="purple" className={tagClass}>
                <AlertTriangle size={11} /> Exception
              </Tag>
            );
          default:
            return (
              <Tag className="flex items-center gap-1 w-fit text-xs font-medium px-2 py-0.5 rounded-md">
                <Clock size={11} /> {status || "Pending"}
              </Tag>
            );
        }
      },
    },
    {
      title: "Actions",
      key: "actions",
      width: 180,
      render: (_: any, record: ScoreResult) => (
        <div className="flex items-center gap-1">
          {/* View Detail */}
          <Tooltip title="View details">
            <Button
              type="text"
              size="small"
              icon={<Eye size={14} />}
              className="text-slate-400 hover:text-indigo-500! hover:bg-indigo-50! rounded-md"
              onClick={() => handleViewDetail(record.studentId)}
            />
          </Tooltip>

          {/* Edit Path */}
          <Tooltip title="Edit folder path">
            <Button
              type="text"
              size="small"
              icon={<Pencil size={14} />}
              className="text-slate-400 hover:text-amber-500! hover:bg-amber-50! rounded-md"
              onClick={() => handleOpenEdit(record)}
            />
          </Tooltip>

          {/* Grade Single */}
          <Tooltip title="Grade this submission">
            <Button
              type="text"
              size="small"
              icon={<Zap size={14} />}
              loading={gradingSingleId === record.studentId}
              className="text-slate-400 hover:text-emerald-500! hover:bg-emerald-50! rounded-md"
              onClick={() => handleGradeSingle(record)}
            />
          </Tooltip>

          {/* Delete */}
          <Popconfirm
            title="Delete submission"
            description={`Are you sure you want to delete "${record.studentName}"?`}
            onConfirm={() => handleDelete(record.studentId)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete submission">
              <Button
                type="text"
                size="small"
                icon={<Trash2 size={14} />}
                className="text-slate-400 hover:text-red-500! hover:bg-red-50! rounded-md"
              />
            </Tooltip>
          </Popconfirm>
        </div>
      ),
    },
  ];

  /* ───────── Render ───────── */
  return (
    <div className="min-h-screen bg-[#f8fafc] font-[Inter,_sans-serif] text-slate-800 flex flex-col">
      {/* ── Header ── */}
      <header className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950 text-white border-b border-slate-800/50 sticky top-0 z-50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Activity size={16} className="text-white" />
            </div>
            <span className="font-semibold text-base tracking-tight">
              GradeHub
            </span>
            <span className="text-slate-500 text-sm hidden sm:inline">
              / Auto Grader
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded hidden sm:inline-block">
              {import.meta.env.VITE_API_BASE_URL}
            </span>
            <div className="w-2 h-2 rounded-full bg-emerald-400 pulse-dot" />
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* ── Page title ── */}
        <div className="mb-8 animate-fade-in-up">
          <h1 className="text-2xl font-semibold text-slate-800 m-0 tracking-tight">
            Automated Grading
          </h1>
          <p className="text-slate-500 text-sm mt-1 m-0">
            Build, test, and score student submissions in one click
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── Left panel ── */}
          <div className="lg:col-span-4 xl:col-span-3 flex flex-col gap-4 animate-fade-in-up">
            {/* Folder scan card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 card-hover shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
                  <FolderOpen size={14} className="text-indigo-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700 m-0">
                  Scan Directory
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Input
                  placeholder="e.g. D:\submissions"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  onPressEnter={handleGetFolders}
                  prefix={
                    <FolderOpen size={14} className="text-slate-400" />
                  }
                  size="middle"
                  className="rounded-lg border-slate-200 text-sm"
                />
                <Button
                  onClick={handleGetFolders}
                  loading={loading}
                  className="w-full border-slate-200 text-slate-600 hover:border-indigo-300! hover:text-indigo-600! rounded-lg text-sm h-9 font-medium"
                >
                  <FolderOpen size={14} />
                  Load Submissions
                </Button>
              </div>
            </div>

            {/* Grade All card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 card-hover shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-7 h-7 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <PlayCircle size={14} className="text-emerald-500" />
                </div>
                <p className="text-sm font-semibold text-slate-700 m-0">
                  Grade All
                </p>
              </div>
              <p className="text-xs text-slate-400 mb-4 ml-9 m-0">
                Build & run tests on all loaded submissions
              </p>
              <Button
                type="primary"
                size="middle"
                onClick={handleGradeAll}
                loading={loading}
                icon={<PlayCircle size={15} />}
                className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600! hover:to-purple-700! border-0 rounded-lg text-sm h-10 font-medium flex items-center justify-center gap-2 shadow-md shadow-indigo-500/20"
              >
                Start Grading
              </Button>
            </div>


          </div>

          {/* ── Right panel — Table ── */}
          <div className="lg:col-span-8 xl:col-span-9 animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden h-full flex flex-col shadow-sm">
              {/* Table header */}
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-700">
                      Submissions
                    </span>
                    {totalItems > 0 && (
                      <span className="text-[11px] text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full font-medium">
                        {totalItems}
                      </span>
                    )}
                  </div>
                  <Button
                    size="small"
                    onClick={() => fetchResults()}
                    loading={loading}
                    icon={<RefreshCw size={13} />}
                    className="border-slate-200 text-slate-500 hover:border-indigo-300! hover:text-indigo-500! rounded-lg text-xs flex items-center gap-1"
                  >
                    Refresh
                  </Button>
                </div>

                {/* Filters row */}
                <div className="flex flex-wrap gap-2">
                  <Input.Search
                    placeholder="Search by student name..."
                    allowClear
                    size="small"
                    prefix={
                      <Search size={13} className="text-slate-400" />
                    }
                    onSearch={handleSearch}
                    className="flex-1 min-w-48 text-sm"
                  />
                  <Select
                    mode="multiple"
                    placeholder="Status"
                    options={STATUS_OPTIONS}
                    onChange={handleStatusFilter}
                    size="small"
                    className="min-w-32"
                    maxTagCount="responsive"
                    allowClear
                  />
                  <Select
                    placeholder={
                      <span className="flex items-center gap-1">
                        <ArrowUpDown size={12} /> Sort
                      </span>
                    }
                    options={SORT_OPTIONS}
                    onChange={handleSortChange}
                    size="small"
                    className="min-w-36"
                    allowClear
                    value={sortOption}
                  />
                </div>
              </div>

              {/* Data table */}
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
                  showTotal: (total) =>
                    `${total} submission${total !== 1 ? "s" : ""}`,
                  className: "px-4",
                }}
                locale={{
                  emptyText: (
                    <div className="py-16 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-slate-100 rounded-2xl flex items-center justify-center">
                        <FolderOpen
                          size={28}
                          className="text-slate-300"
                        />
                      </div>
                      <p className="text-slate-400 text-sm m-0">
                        No submissions yet
                      </p>
                      <p className="text-slate-300 text-xs mt-1 m-0">
                        Load a directory to get started
                      </p>
                    </div>
                  ),
                }}
                className="[&_.ant-table-thead_th]:bg-slate-50/80 [&_.ant-table-thead_th]:text-slate-500 [&_.ant-table-thead_th]:font-medium [&_.ant-table-thead_th]:text-xs [&_.ant-table-row:hover_td]:bg-indigo-50/30 [&_.ant-table-tbody_td]:py-2.5 [&_.ant-table-tbody_td]:border-slate-100"
              />
            </div>
          </div>
        </div>
      </main>

      {/* ── Detail Modal (GET /api/folders/:id) ── */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center">
              <Eye size={14} className="text-indigo-500" />
            </div>
            <span>Submission Details</span>
          </div>
        }
        open={detailOpen}
        onCancel={() => {
          setDetailOpen(false);
          setDetailRecord(null);
        }}
        footer={null}
        width={560}
      >
        {detailLoading ? (
          <div className="flex items-center justify-center py-12">
            <Spin size="large" />
          </div>
        ) : detailRecord ? (
          <Descriptions
            column={1}
            bordered
            size="small"
            className="mt-4"
            labelStyle={{
              fontWeight: 500,
              color: "#475569",
              width: 130,
              fontSize: 13,
            }}
            contentStyle={{ fontSize: 13 }}
          >
            <Descriptions.Item label="ID">
              {detailRecord.studentId}
            </Descriptions.Item>
            <Descriptions.Item label="Student">
              {detailRecord.studentName}
            </Descriptions.Item>
            <Descriptions.Item label="Folder Path">
              <span className="font-mono text-xs break-all">
                {detailRecord.projectFolder || "—"}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Score">
              <span
                className={`font-bold ${detailRecord.score >= 50
                    ? "text-emerald-600"
                    : "text-red-500"
                  }`}
              >
                {detailRecord.score}
              </span>
            </Descriptions.Item>
            <Descriptions.Item label="Points">
              {detailRecord.points}
            </Descriptions.Item>
            <Descriptions.Item label="Status">
              {detailRecord.status === "Passed" ? (
                <Tag color="success">Passed</Tag>
              ) : detailRecord.status === "Failed" ? (
                <Tag color="orange">Failed</Tag>
              ) : detailRecord.status === "BuildFailed" ? (
                <Tag color="error">Build Failed</Tag>
              ) : detailRecord.status === "StartupTimeout" ? (
                <Tag color="warning">Startup Timeout</Tag>
              ) : detailRecord.status === "Exception" ? (
                <Tag color="purple">Exception</Tag>
              ) : (
                <Tag>{detailRecord.status || "Pending"}</Tag>
              )}
            </Descriptions.Item>
          </Descriptions>
        ) : null}
      </Modal>

      {/* ── Edit Path Modal (PUT /api/folders/:id/path) ── */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-50 rounded-lg flex items-center justify-center">
              <Pencil size={14} className="text-amber-500" />
            </div>
            <span>Update Folder Path</span>
          </div>
        }
        open={editOpen}
        onCancel={() => setEditOpen(false)}
        onOk={handleSavePath}
        confirmLoading={editLoading}
        okText="Save"
        width={520}
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-600 mb-2">
            Project Folder Path
          </label>
          <Input
            value={editPath}
            onChange={(e) => setEditPath(e.target.value)}
            placeholder="e.g. C:\Users\Admin\Desktop\submissions\SE171286_ThinhVQ"
            prefix={<FolderOpen size={14} className="text-slate-400" />}
            className="rounded-lg"
            onPressEnter={handleSavePath}
          />
          <p className="text-xs text-slate-400 mt-2 m-0">
            Set the absolute path to this student's project folder on the server.
          </p>
        </div>
      </Modal>
    </div>
  );
}
