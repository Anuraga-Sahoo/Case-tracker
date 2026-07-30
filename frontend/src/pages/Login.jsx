import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert, Space, Divider } from 'antd';
import { LockOutlined, UserOutlined, FolderOpenOutlined } from '@ant-design/icons';
import axios from 'axios';
import { AuthContext } from '../App';

const { Title, Text, Paragraph } = Typography;

const Login = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { user, login } = useContext(AuthContext);
  const navigate = useNavigate();

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const onFinish = async (values) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const response = await axios.post('https://case-tracker-evo3.onrender.com/auth/login', values);
      const { token, ...userData } = response.data;
      login(userData, token);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message || 'Failed to login. Please check your network and credentials.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (username) => {
    form.setFieldsValue({
      username: username,
      password: 'password123',
    });
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px',
        background: 'radial-gradient(circle at center, #1e1b4b 0%, #020617 80%)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
        <FolderOpenOutlined style={{ fontSize: '32px', color: '#6366f1' }} />
        <Title level={2} style={{ margin: 0, color: '#f8fafc', fontWeight: 700 }}>
          Case<span style={{ color: '#6366f1' }}>Tracker</span>
        </Title>
      </div>

      <Card
        className="glass-card fade-in"
        style={{
          width: '100%',
          maxWidth: '420px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
        }}
      >
        <Title level={4} style={{ color: '#f8fafc', textAlign: 'center', marginBottom: '4px' }}>
          Welcome Back
        </Title>
        <Paragraph style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '24px' }}>
          Log in to manage operations cases
        </Paragraph>

        {errorMsg && (
          <Alert
            message={errorMsg}
            type="error"
            showIcon
            style={{ marginBottom: '20px', borderRadius: '6px' }}
          />
        )}

        <Form
          form={form}
          name="login_form"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Please enter your username' },
              { whitespace: true, message: 'Username cannot be blank' },
            ]}
          >
            <Input
              prefix={<UserOutlined style={{ color: '#64748b' }} />}
              placeholder="Username"
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
              }}
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please enter your password' }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: '#64748b' }} />}
              placeholder="Password"
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
              }}
            />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              block
              style={{
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                border: 'none',
                height: '44px',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              }}
            >
              Log In
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '20px 0' }}>
          <Text style={{ color: '#64748b', fontSize: '12px' }}>DEMO CREDENTIALS</Text>
        </Divider>

        <Space direction="vertical" style={{ width: '100%' }} size="small">
          <Button
            type="dashed"
            block
            onClick={() => handleQuickLogin('manager')}
            style={{ borderColor: 'rgba(255, 255, 255, 0.15)', color: '#cbd5e1' }}
          >
            Log in as <Text strong style={{ color: '#fbbf24', marginLeft: '4px' }}>Sarah (Manager)</Text>
          </Button>
          <Button
            type="dashed"
            block
            onClick={() => handleQuickLogin('agent1')}
            style={{ borderColor: 'rgba(255, 255, 255, 0.15)', color: '#cbd5e1' }}
          >
            Log in as <Text strong style={{ color: '#38bdf8', marginLeft: '4px' }}>Alex (Agent)</Text>
          </Button>
        </Space>

        <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '20px 0' }} />

        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#94a3b8' }}>Don't have an account? </Text>
          <Link to="/signup" style={{ color: '#818cf8', fontWeight: 600 }}>
            Sign Up
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Login;
