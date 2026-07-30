import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Card,
  Input,
  Select,
  Button,
  Tag,
  Typography,
  Space,
  Modal,
  Form,
  DatePicker,
  message,
  Pagination,
  Row,
  Col,
} from 'antd';
import {
  SearchOutlined,
  PlusOutlined,
  FilterOutlined,
  EyeOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { AuthContext } from '../App';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const Dashboard = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  // State for cases table
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(8);

  // Filter states
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');

  // Agents list (Manager only)
  const [agents, setAgents] = useState([]);

  // Create Case Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createForm] = Form.useForm();
  const [createLoading, setCreateLoading] = useState(false);

  // Fetch agents list
  const fetchAgents = async () => {
    if (user?.role !== 'Manager') return;
    try {
      const response = await axios.get('/auth/agents');
      setAgents(response.data);
    } catch (err) {
      console.error('Error fetching agents:', err);
    }
  };

  // Fetch cases
  const fetchCases = async () => {
    setLoading(true);
    try {
      const params = {
        page,
        limit,
        search: searchText,
        status: statusFilter,
      };

      if (user?.role === 'Manager' && agentFilter) {
        params.agent = agentFilter;
      }

      const response = await axios.get('/cases', { params });
      setCases(response.data.cases);
      setTotal(response.data.total);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [page, statusFilter, agentFilter, searchText]);

  useEffect(() => {
    fetchAgents();
  }, []);

  // Handle case creation
  const handleCreateCase = async (values) => {
    setCreateLoading(true);
    try {
      const payload = {
        ...values,
        dueDate: values.dueDate.toISOString(),
      };
      await axios.post('/cases', payload);
      message.success('Case created successfully!');
      setIsModalOpen(false);
      createForm.resetFields();
      setPage(1); // Go to first page
      fetchCases();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Failed to create case');
    } finally {
      setCreateLoading(false);
    }
  };

  // Status tag colors mapping
  const getStatusTag = (status) => {
    const statusMap = {
      New: { color: 'blue', text: 'New' },
      Assigned: { color: 'cyan', text: 'Assigned' },
      'In Progress': { color: 'orange', text: 'In Progress' },
      Submitted: { color: 'purple', text: 'Submitted' },
      Cleared: { color: 'green', text: 'Cleared' },
      Discrepant: { color: 'red', text: 'Discrepant' },
    };
    const details = statusMap[status] || { color: 'default', text: status };
    return <Tag color={details.color} style={{ fontWeight: 500 }}>{details.text}</Tag>;
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchText('');
    setStatusFilter('');
    setAgentFilter('');
    setPage(1);
  };

  // Table Columns
  const columns = [
    {
      title: 'Client Name',
      dataIndex: 'clientName',
      key: 'clientName',
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Subject Name',
      dataIndex: 'subjectName',
      key: 'subjectName',
    },
    {
      title: 'Case Type',
      dataIndex: 'caseType',
      key: 'caseType',
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date) => {
        const dueDate = dayjs(date);
        const isOverdue = dueDate.isBefore(dayjs()) && !['Cleared', 'Discrepant'].includes(cases.find(c => c.dueDate === date)?.status);
        return (
          <Text type={isOverdue ? 'danger' : 'default'} style={{ fontWeight: isOverdue ? 600 : 'normal' }}>
            {dueDate.format('MMM DD, YYYY')}
            {isOverdue && ' (Overdue)'}
          </Text>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
  ];

  // Add "Assigned To" column for Managers
  if (user?.role === 'Manager') {
    columns.push({
      title: 'Assigned Agent',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      render: (assignedTo) => (
        <Text style={{ color: assignedTo ? '#f8fafc' : '#64748b', fontStyle: assignedTo ? 'normal' : 'italic' }}>
          {assignedTo ? assignedTo.fullName : 'Unassigned'}
        </Text>
      ),
    });
  }

  // Add Action column
  columns.push({
    title: 'Action',
    key: 'action',
    render: (_, record) => (
      <Button
        type="primary"
        ghost
        size="small"
        icon={<EyeOutlined />}
        onClick={() => navigate(`/cases/${record._id}`)}
      >
        Details
      </Button>
    ),
  });

  return (
    <div className="fade-in">
      {/* Upper Dashboard Statistics Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
        <Col>
          <Title level={3} style={{ margin: 0, color: '#f8fafc' }}>
            {user?.role === 'Manager' ? 'All Operations Cases' : 'My Assigned Cases'}
          </Title>
          <Text style={{ color: '#94a3b8' }}>
            Enforcing workflow transitions and audit compliance logs
          </Text>
        </Col>
        {user?.role === 'Manager' && (
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setIsModalOpen(true)}
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none',
                height: '40px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              Create Case
            </Button>
          </Col>
        )}
      </Row>

      {/* Filter and Search Panel */}
      <Card
        className="glass-card"
        style={{ marginBottom: '24px', padding: '4px' }}
        styles={{ body: { padding: '16px' } }}
      >
        <Row g={16} gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Input
              placeholder="Search by client, subject, or type..."
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              allowClear
              style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.08)' }}
            />
          </Col>
          <Col xs={12} md={5}>
            <Select
              placeholder="Filter by Status"
              style={{ width: '100%' }}
              value={statusFilter || undefined}
              onChange={(val) => {
                setStatusFilter(val || '');
                setPage(1);
              }}
              allowClear
            >
              <Option value="New">New</Option>
              <Option value="Assigned">Assigned</Option>
              <Option value="In Progress">In Progress</Option>
              <Option value="Submitted">Submitted</Option>
              <Option value="Cleared">Cleared</Option>
              <Option value="Discrepant">Discrepant</Option>
            </Select>
          </Col>
          {user?.role === 'Manager' && (
            <Col xs={12} md={5}>
              <Select
                placeholder="Filter by Agent"
                style={{ width: '100%' }}
                value={agentFilter || undefined}
                onChange={(val) => {
                  setAgentFilter(val || '');
                  setPage(1);
                }}
                allowClear
              >
                {agents.map((agent) => (
                  <Option key={agent._id} value={agent._id}>
                    {agent.fullName}
                  </Option>
                ))}
              </Select>
            </Col>
          )}
          <Col xs={24} md={6}>
            <Space>
              <Button
                icon={<SyncOutlined />}
                onClick={fetchCases}
                loading={loading}
                style={{ background: 'transparent', color: '#94a3b8', borderColor: 'rgba(255, 255, 255, 0.1)' }}
              >
                Refresh
              </Button>
              {(searchText || statusFilter || agentFilter) && (
                <Button
                  type="text"
                  danger
                  onClick={handleResetFilters}
                >
                  Reset Filters
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Cases Table */}
      <Card
        className="glass-card"
        styles={{ body: { padding: 0 } }}
        style={{ overflow: 'hidden' }}
      >
        <Table
          columns={columns}
          dataSource={cases}
          rowKey="_id"
          pagination={false}
          loading={loading}
          locale={{ emptyText: 'No cases found.' }}
        />
        <div style={{ padding: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <Pagination
            current={page}
            total={total}
            pageSize={limit}
            onChange={(p) => setPage(p)}
            showSizeChanger={false}
          />
        </div>
      </Card>

      {/* Create Case Modal (Manager Only) */}
      {user?.role === 'Manager' && (
        <Modal
          title={
            <div style={{ fontSize: '18px', fontWeight: 600, color: '#f8fafc', marginBottom: '8px' }}>
              Create New Operations Case
            </div>
          }
          open={isModalOpen}
          onCancel={() => {
            setIsModalOpen(false);
            createForm.resetFields();
          }}
          footer={null}
          styles={{
            mask: { backdropFilter: 'blur(4px)' },
            content: {
              background: '#1e293b',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
            },
          }}
        >
          <Form
            form={createForm}
            layout="vertical"
            onFinish={handleCreateCase}
            requiredMark="optional"
            size="large"
          >
            <Form.Item
              name="clientName"
              label={<Text style={{ color: '#cbd5e1' }}>Client Name</Text>}
              rules={[{ required: true, message: 'Client name is required' }]}
            >
              <Input
                placeholder="e.g. Acme Corp"
                style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              />
            </Form.Item>

            <Form.Item
              name="subjectName"
              label={<Text style={{ color: '#cbd5e1' }}>Subject Name</Text>}
              rules={[{ required: true, message: 'Subject name is required' }]}
            >
              <Input
                placeholder="e.g. John Doe Background Check"
                style={{ background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
              />
            </Form.Item>

            <Form.Item
              name="caseType"
              label={<Text style={{ color: '#cbd5e1' }}>Case Type</Text>}
              rules={[{ required: true, message: 'Case type is required' }]}
            >
              <Select
                placeholder="Select Case Type"
                style={{ width: '100%' }}
                dropdownStyle={{ background: '#1e293b' }}
              >
                <Option value="Employment Screening">Employment Screening</Option>
                <Option value="Financial Compliance">Financial Compliance</Option>
                <Option value="Identity Verification">Identity Verification</Option>
                <Option value="Contract Audit">Contract Audit</Option>
                <Option value="Logistics Check">Logistics Check</Option>
              </Select>
            </Form.Item>

            <Form.Item
              name="dueDate"
              label={<Text style={{ color: '#cbd5e1' }}>Due Date</Text>}
              rules={[{ required: true, message: 'Due date is required' }]}
            >
              <DatePicker
                style={{ width: '100%', background: 'rgba(15, 23, 42, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)' }}
                disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
              />
            </Form.Item>

            <Form.Item
              name="assignedTo"
              label={
                <Space>
                  <Text style={{ color: '#cbd5e1' }}>Assign to Agent</Text>
                  <Text type="secondary" style={{ fontSize: '12px' }}>(Optional)</Text>
                </Space>
              }
            >
              <Select
                placeholder="Select Agent to Assign"
                style={{ width: '100%' }}
                allowClear
                dropdownStyle={{ background: '#1e293b' }}
              >
                {agents.map((agent) => (
                  <Option key={agent._id} value={agent._id}>
                    {agent.fullName}
                  </Option>
                ))}
              </Select>
            </Form.Item>

            <Form.Item style={{ marginBottom: 0, marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
              <Space>
                <Button
                  onClick={() => {
                    setIsModalOpen(false);
                    createForm.resetFields();
                  }}
                  style={{ background: 'transparent', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1' }}
                >
                  Cancel
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={createLoading}
                  style={{
                    background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                    border: 'none',
                    fontWeight: 600,
                  }}
                >
                  Submit
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      )}
    </div>
  );
};

export default Dashboard;
