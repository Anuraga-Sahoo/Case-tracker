import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Card,
  Row,
  Col,
  Typography,
  Steps,
  Button,
  Upload,
  Input,
  Timeline,
  Space,
  Divider,
  Tag,
  Modal,
  Form,
  Select,
  message,
  Tabs,
  Badge,
} from 'antd';
import {
  ArrowLeftOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MessageOutlined,
  HistoryOutlined,
  FileOutlined,
  PaperClipOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import axios from 'axios';
import { AuthContext } from '../App';
import dayjs from 'dayjs';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const CaseDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  // States
  const [caseData, setCaseData] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [comments, setComments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [commentText, setCommentText] = useState('');
  const [agentNotes, setAgentNotes] = useState('');
  const [managerFeedback, setManagerFeedback] = useState('');

  // Modals / Dropdowns
  const [agents, setAgents] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);

  // Base URL for document downloads
  const backendBaseUrl = import.meta.env.VITE_API_URL 
    ? import.meta.env.VITE_API_URL.replace('/api', '') 
    : (import.meta.env.PROD ? 'https://case-tracker-evo3.onrender.com' : 'http://localhost:5000');

  const fetchCaseDetails = async () => {
    try {
      const response = await axios.get(`/cases/${id}`);
      setCaseData(response.data.case);
      setDocuments(response.data.documents);
      setComments(response.data.comments);
      setAuditLogs(response.data.auditLogs);
      setAgentNotes(response.data.case.notes || '');
      setSelectedAgent(response.data.case.assignedTo?._id || null);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Failed to fetch case details');
      navigate('/');
    } finally {
      setLoading(false);
    }
  };

  const fetchAgents = async () => {
    if (user?.role !== 'Manager') return;
    try {
      const response = await axios.get('/auth/agents');
      setAgents(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCaseDetails();
    fetchAgents();
  }, [id]);

  // Handle status transition
  const handleStatusChange = async (newStatus, notesPayload = {}) => {
    try {
      const response = await axios.put(`/cases/${id}/status`, {
        status: newStatus,
        ...notesPayload,
      });
      message.success(`Status updated to ${newStatus}`);
      setIsRejectModalOpen(false);
      setIsApproveModalOpen(false);
      setManagerFeedback('');
      fetchCaseDetails();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Failed to update status');
    }
  };

  // Handle Manager assignment changes
  const handleAssignAgent = async () => {
    setIsAssigning(true);
    try {
      await axios.put(`/cases/${id}`, {
        assignedTo: selectedAgent,
      });
      message.success('Agent assignment updated successfully');
      fetchCaseDetails();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || 'Failed to assign agent');
    } finally {
      setIsAssigning(false);
    }
  };

  // Add Comment
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    try {
      const response = await axios.post(`/comments/${id}`, { text: commentText });
      setComments([...comments, response.data]);
      setCommentText('');
      message.success('Comment posted');
      // Refresh audit logs in case there's logging
      fetchCaseDetails();
    } catch (err) {
      console.error(err);
      message.error('Failed to post comment');
    }
  };

  // Custom Upload handler for Multer
  const handleCustomUpload = async ({ file, onSuccess, onError }) => {
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post(`/documents/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      message.success(`${file.name} uploaded successfully.`);
      onSuccess(response.data);
      fetchCaseDetails();
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || `Upload failed for ${file.name}`);
      onError(err);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '100px' }}>
        <Badge status="processing" text="Loading case data..." />
      </div>
    );
  }

  if (!caseData) return null;

  // Process Steps
  const getStepsInfo = () => {
    const stepItems = [
      { title: 'New', description: 'Created' },
      { title: 'Assigned', description: 'Assigned to Agent' },
      { title: 'In Progress', description: 'Work commenced' },
      { title: 'Submitted', description: 'Pending approval' },
    ];

    if (caseData.status === 'Cleared') {
      stepItems.push({ title: 'Cleared', description: 'Approved' });
      return { current: 4, items: stepItems, status: 'finish' };
    } else if (caseData.status === 'Discrepant') {
      stepItems.push({ title: 'Discrepant', description: 'Issues identified' });
      return { current: 4, items: stepItems, status: 'error' };
    }

    const currentMap = {
      New: 0,
      Assigned: 1,
      'In Progress': 2,
      Submitted: 3,
    };

    return {
      current: currentMap[caseData.status] ?? 0,
      items: stepItems.concat([{ title: 'Cleared / Discrepant', description: 'Verdict pending' }]),
      status: 'process',
    };
  };

  const stepsInfo = getStepsInfo();

  // Status tag colors
  const statusColorMap = {
    New: 'blue',
    Assigned: 'cyan',
    'In Progress': 'orange',
    Submitted: 'purple',
    Cleared: 'green',
    Discrepant: 'red',
  };

  const isImage = (filename) => {
    const ext = filename.split('.').pop().toLowerCase();
    return ['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext);
  };

  return (
    <div className="fade-in">
      {/* Top Breadcrumb Header */}
      <Link to="/" style={{ color: '#94a3b8', display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
        <ArrowLeftOutlined /> Back to Cases Dashboard
      </Link>

      <Row gutter={[24, 24]} align="middle" style={{ marginBottom: '24px' }}>
        <Col xs={24} md={16}>
          <Space align="center" size="middle" style={{ flexWrap: 'wrap' }}>
            <Title level={2} style={{ margin: 0, color: '#f8fafc' }}>
              {caseData.clientName}
            </Title>
            <Text type="secondary" style={{ fontSize: '18px' }}>|</Text>
            <Text style={{ fontSize: '18px', color: '#cbd5e1' }}>{caseData.subjectName}</Text>
            <Tag color={statusColorMap[caseData.status]} style={{ fontSize: '13px', padding: '2px 10px', fontWeight: 600 }}>
              {caseData.status}
            </Tag>
          </Space>
        </Col>
      </Row>

      {/* Visual Stepper */}
      <Card className="glass-card" style={{ marginBottom: '24px' }}>
        <Steps
          current={stepsInfo.current}
          status={stepsInfo.status}
          items={stepsInfo.items}
          responsive
          style={{ padding: '8px 0' }}
        />
      </Card>

      <Row gutter={[24, 24]}>
        {/* Left Hand: Metadata & Main Work Area */}
        <Col xs={24} lg={16}>
          {/* Metadata Card */}
          <Card
            title={<Text strong style={{ color: '#f8fafc' }}>Case Information</Text>}
            style={{ marginBottom: '24px' }}
          >
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <Text type="secondary" block style={{ fontSize: '12px' }}>CASE TYPE</Text>
                <Text strong style={{ color: '#cbd5e1' }}>{caseData.caseType}</Text>
              </Col>
              <Col xs={12} sm={6}>
                <Text type="secondary" block style={{ fontSize: '12px' }}>DUE DATE</Text>
                <Text strong style={{ color: dayjs(caseData.dueDate).isBefore(dayjs()) && !['Cleared', 'Submitted'].includes(caseData.status) ? '#ef4444' : '#cbd5e1' }}>
                  {dayjs(caseData.dueDate).format('MMM DD, YYYY')}
                </Text>
              </Col>
              <Col xs={12} sm={6}>
                <Text type="secondary" block style={{ fontSize: '12px' }}>ASSIGNED AGENT</Text>
                <Text strong style={{ color: '#cbd5e1' }}>
                  {caseData.assignedTo?.fullName || 'Unassigned'}
                </Text>
              </Col>
              <Col xs={12} sm={6}>
                <Text type="secondary" block style={{ fontSize: '12px' }}>CREATED AT</Text>
                <Text style={{ color: '#cbd5e1' }}>{dayjs(caseData.createdAt).format('MMM DD, YYYY')}</Text>
              </Col>
            </Row>

            {caseData.managerFeedback && (
              <>
                <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '16px 0' }} />
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '12px', borderRadius: '6px' }}>
                  <Text type="danger" strong block style={{ marginBottom: '4px', fontSize: '12px' }}>MANAGER VERDICT FEEDBACK</Text>
                  <Paragraph style={{ color: '#fca5a5', margin: 0 }}>{caseData.managerFeedback}</Paragraph>
                </div>
              </>
            )}

            {caseData.notes && (
              <>
                <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.08)', margin: '16px 0' }} />
                <div>
                  <Text type="secondary" block style={{ marginBottom: '4px', fontSize: '12px' }}>AGENT NOTES</Text>
                  <Paragraph style={{ color: '#e2e8f0', margin: 0, fontStyle: 'italic' }}>"{caseData.notes}"</Paragraph>
                </div>
              </>
            )}
          </Card>

          {/* Core Transitions Action and Work Panel */}
          <Card
            title={<Text strong style={{ color: '#f8fafc' }}>Operations Area</Text>}
            style={{ marginBottom: '24px' }}
          >
            {/* Agent Actions */}
            {user?.role === 'Agent' && (
              <div style={{ minHeight: '60px' }}>
                {caseData.status === 'Assigned' && (
                  <div>
                    <Paragraph style={{ color: '#94a3b8' }}>
                      This case is assigned to you. Please accept the case to begin upload and verification work.
                    </Paragraph>
                    <Button
                      type="primary"
                      onClick={() => handleStatusChange('In Progress')}
                      style={{ height: '40px', fontWeight: 600 }}
                    >
                      Start Work (Accept Case)
                    </Button>
                  </div>
                )}

                {['In Progress', 'Discrepant'].includes(caseData.status) && (
                  <Space direction="vertical" style={{ width: '100%' }} size="large">
                    <div>
                      <Text strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
                        1. Upload Supporting Photos / Documents
                      </Text>
                      <Upload
                        customRequest={handleCustomUpload}
                        showUploadList={false}
                      >
                        <Button icon={<UploadOutlined />} type="dashed" style={{ color: '#a5b4fc', borderColor: 'rgba(165, 180, 252, 0.3)' }}>
                          Upload File
                        </Button>
                      </Upload>
                    </div>

                    <div>
                      <Text strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
                        2. Completion Notes
                      </Text>
                      <TextArea
                        placeholder="Write down any notes or details verified for the manager..."
                        rows={3}
                        value={agentNotes}
                        onChange={(e) => setAgentNotes(e.target.value)}
                        style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                      />
                    </div>

                    <div>
                      <Text strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '8px' }}>
                        3. Submit Case
                      </Text>
                      <Paragraph style={{ color: '#94a3b8', fontSize: '13px' }}>
                        Submitting flags the manager to review uploaded files and make a final verdict.
                      </Paragraph>
                      <Button
                        type="primary"
                        onClick={() => handleStatusChange('Submitted', { notes: agentNotes })}
                        style={{
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          fontWeight: 600,
                          height: '40px',
                        }}
                      >
                        Submit Case for Review
                      </Button>
                    </div>
                  </Space>
                )}

                {['New', 'Submitted', 'Cleared'].includes(caseData.status) && (
                  <Text type="secondary">
                    No work actions currently available. Status is: <Text strong>{caseData.status}</Text>
                  </Text>
                )}
              </div>
            )}

            {/* Manager Actions */}
            {user?.role === 'Manager' && (
              <div>
                {['New', 'Assigned'].includes(caseData.status) && (
                  <div>
                    <Text strong style={{ color: '#cbd5e1', display: 'block', marginBottom: '12px' }}>
                      Assign Case to Agent
                    </Text>
                    <Space size="middle">
                      <Select
                        placeholder="Select Agent"
                        value={selectedAgent}
                        onChange={(val) => setSelectedAgent(val)}
                        style={{ width: '220px' }}
                        allowClear
                      >
                        {agents.map((agent) => (
                          <Option key={agent._id} value={agent._id}>
                            {agent.fullName}
                          </Option>
                        ))}
                      </Select>
                      <Button
                        type="primary"
                        onClick={handleAssignAgent}
                        loading={isAssigning}
                      >
                        Save Assignment
                      </Button>
                    </Space>
                  </div>
                )}

                {caseData.status === 'Submitted' && (
                  <div>
                    <Paragraph style={{ color: '#94a3b8' }}>
                      The agent has completed documentation and submitted this case. Please review files and notes, then set a final status.
                    </Paragraph>
                    <Space size="middle">
                      <Button
                        type="primary"
                        icon={<CheckCircleOutlined />}
                        onClick={() => setIsApproveModalOpen(true)}
                        style={{ background: '#059669', borderColor: '#059669', height: '40px', fontWeight: 600 }}
                      >
                        Clear Case (Approve)
                      </Button>
                      <Button
                        danger
                        icon={<ExclamationCircleOutlined />}
                        onClick={() => setIsRejectModalOpen(true)}
                        style={{ height: '40px', fontWeight: 600 }}
                      >
                        Mark Discrepant (Reject)
                      </Button>
                    </Space>
                  </div>
                )}

                {['In Progress', 'Discrepant', 'Cleared'].includes(caseData.status) && (
                  <Text type="secondary">
                    Waiting for agent progress. Current status is <Text strong style={{ color: '#fff' }}>{caseData.status}</Text>
                  </Text>
                )}
              </div>
            )}
          </Card>

          {/* Uploaded Documents List */}
          <Card
            title={<Text strong style={{ color: '#f8fafc' }}>Uploaded Documents & Photos ({documents.length})</Text>}
            style={{ marginBottom: '24px' }}
          >
            {documents.length === 0 ? (
              <Text type="secondary" style={{ fontStyle: 'italic' }}>No supporting files uploaded yet.</Text>
            ) : (
              <Row gutter={[16, 16]}>
                {documents.map((doc) => {
                  const downloadUrl = `${backendBaseUrl}${doc.filepath}`;
                  const isImg = isImage(doc.filename);
                  return (
                    <Col xs={24} sm={12} key={doc._id}>
                      <Card
                        style={{
                          background: 'rgba(15, 23, 42, 0.3)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          borderRadius: '8px',
                        }}
                        styles={{ body: { padding: '12px' } }}
                      >
                        <Row gutter={12} align="middle">
                          <Col span={6}>
                            {isImg ? (
                              <img
                                src={downloadUrl}
                                alt={doc.originalName}
                                style={{
                                  width: '100%',
                                  height: '50px',
                                  objectFit: 'cover',
                                  borderRadius: '4px',
                                  border: '1px solid rgba(255, 255, 255, 0.1)',
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: '100%',
                                  height: '50px',
                                  background: 'rgba(15, 23, 42, 0.8)',
                                  borderRadius: '4px',
                                  display: 'flex',
                                  justifyContent: 'center',
                                  alignItems: 'center',
                                  color: '#818cf8',
                                }}
                              >
                                <FileOutlined style={{ fontSize: '20px' }} />
                              </div>
                            )}
                          </Col>
                          <Col span={18}>
                            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <Text strong style={{ fontSize: '13px', color: '#cbd5e1' }} block>
                                {doc.originalName}
                              </Text>
                              <Text type="secondary" style={{ fontSize: '11px' }} block>
                                Uploaded by {doc.uploadedBy?.fullName} ({doc.uploadedBy?.role})
                              </Text>
                              <a
                                href={downloadUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ fontSize: '12px', color: '#818cf8', display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}
                              >
                                <PaperClipOutlined /> Download File
                              </a>
                            </div>
                          </Col>
                        </Row>
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            )}
          </Card>
        </Col>

        {/* Right Hand: Activity Logs & Comments */}
        <Col xs={24} lg={8}>
          <Tabs
            defaultActiveKey="comments"
            className="glass-card"
            style={{ padding: '16px', minHeight: '400px' }}
            items={[
              {
                key: 'comments',
                label: (
                  <span style={{ color: '#cbd5e1' }}>
                    <MessageOutlined /> Comments ({comments.length})
                  </span>
                ),
                children: (
                  <div>
                    {/* Add Comment form */}
                    <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                      <Input
                        placeholder="Write a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
                      />
                      <Button type="primary" htmlType="submit" icon={<SendOutlined />} />
                    </form>

                    <div style={{ maxHeight: '420px', overflowY: 'auto', paddingRight: '4px' }}>
                      {comments.length === 0 ? (
                        <Text type="secondary" style={{ display: 'block', textAlign: 'center', marginTop: '24px', fontStyle: 'italic' }}>
                          No comments posted yet.
                        </Text>
                      ) : (
                        <Space direction="vertical" style={{ width: '100%' }} size="middle">
                          {comments.map((comment) => (
                            <div
                              key={comment._id}
                              style={{
                                background: 'rgba(15, 23, 42, 0.3)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                padding: '10px',
                                borderRadius: '6px',
                              }}
                            >
                              <Row justify="space-between" align="middle" style={{ marginBottom: '4px' }}>
                                <Col>
                                  <Text strong style={{ color: '#fff', fontSize: '13px' }}>
                                    {comment.author?.fullName}
                                  </Text>
                                  <Text style={{ fontSize: '10px', marginLeft: '6px', background: 'rgba(255, 255, 255, 0.08)', padding: '1px 5px', borderRadius: '4px', color: '#94a3b8' }}>
                                    {comment.author?.role}
                                  </Text>
                                </Col>
                                <Col>
                                  <Text type="secondary" style={{ fontSize: '11px' }}>
                                    {dayjs(comment.createdAt).format('HH:mm A')}
                                  </Text>
                                </Col>
                              </Row>
                              <Paragraph style={{ color: '#cbd5e1', margin: 0, fontSize: '13px' }}>
                                {comment.text}
                              </Paragraph>
                            </div>
                          ))}
                        </Space>
                      )}
                    </div>
                  </div>
                ),
              },
              {
                key: 'audit',
                label: (
                  <span style={{ color: '#cbd5e1' }}>
                    <HistoryOutlined /> Audit Trail
                  </span>
                ),
                children: (
                  <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '8px' }}>
                    <Timeline
                      items={auditLogs.map((log) => ({
                        color: log.newStatus === 'Cleared' ? 'green' : log.newStatus === 'Discrepant' ? 'red' : 'blue',
                        children: (
                          <div>
                            <Text strong style={{ color: '#f1f5f9', display: 'block', fontSize: '12px' }}>
                              {log.action}
                            </Text>
                            <Text type="secondary" style={{ fontSize: '11px' }}>
                              {dayjs(log.timestamp).format('MMM DD, YYYY - HH:mm A')}
                            </Text>
                          </div>
                        ),
                      }))}
                    />
                  </div>
                ),
              },
            ]}
          />
        </Col>
      </Row>

      {/* Manager Verdict: Approve/Clear Modal */}
      <Modal
        title="Clear Case Verification"
        open={isApproveModalOpen}
        onCancel={() => setIsApproveModalOpen(false)}
        footer={null}
        styles={{
          content: { background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)' },
        }}
      >
        <Paragraph style={{ color: '#cbd5e1' }}>
          Are you sure you want to mark this case as <Text strong style={{ color: '#10b981' }}>Cleared</Text>? This marks the case as passed and completes the workflow.
        </Paragraph>
        <Form layout="vertical" onFinish={() => handleStatusChange('Cleared', { managerFeedback })}>
          <Form.Item label={<Text style={{ color: '#cbd5e1' }}>Approval Notes / Feedback (Optional)</Text>}>
            <TextArea
              rows={3}
              placeholder="Provide comments about document approval..."
              value={managerFeedback}
              onChange={(e) => setManagerFeedback(e.target.value)}
              style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
            />
          </Form.Item>
          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0 }}>
            <Space>
              <Button
                onClick={() => setIsApproveModalOpen(false)}
                style={{ background: 'transparent', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1' }}
              >
                Cancel
              </Button>
              <Button type="primary" htmlType="submit" style={{ background: '#059669', borderColor: '#059669' }}>
                Approve & Clear
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Manager Verdict: Mark Discrepant Modal */}
      <Modal
        title="Mark Case as Discrepant"
        open={isRejectModalOpen}
        onCancel={() => setIsRejectModalOpen(false)}
        footer={null}
        styles={{
          content: { background: '#1e293b', border: '1px solid rgba(255, 255, 255, 0.1)' },
        }}
      >
        <Paragraph style={{ color: '#cbd5e1' }}>
          Explain the issue or discrepancy in the documents. The case status will return to <Text strong style={{ color: '#ef4444' }}>Discrepant</Text> and the agent will need to re-verify.
        </Paragraph>
        <Form layout="vertical" onFinish={() => handleStatusChange('Discrepant', { managerFeedback })}>
          <Form.Item
            label={<Text style={{ color: '#cbd5e1' }}>Discrepancy Details / Action Required</Text>}
            rules={[{ required: true, message: 'Please specify the discrepancy details' }]}
          >
            <TextArea
              rows={3}
              placeholder="e.g. Photo resolution is too low, please re-upload clear ID photo..."
              value={managerFeedback}
              onChange={(e) => setManagerFeedback(e.target.value)}
              required
              style={{ background: 'rgba(15, 23, 42, 0.4)', border: '1px solid rgba(255, 255, 255, 0.1)', color: '#fff' }}
            />
          </Form.Item>
          <Form.Item style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 0 }}>
            <Space>
              <Button
                onClick={() => setIsRejectModalOpen(false)}
                style={{ background: 'transparent', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#cbd5e1' }}
              >
                Cancel
              </Button>
              <Button type="primary" danger htmlType="submit">
                Reject & Mark Discrepant
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default CaseDetail;
