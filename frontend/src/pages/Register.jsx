import React, { useState, useContext, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Card, Form, Input, Button, Typography, Alert, Select, Divider } from 'antd';
import { LockOutlined, UserOutlined, FolderOpenOutlined, IdcardOutlined } from '@ant-design/icons';
import axios from 'axios';
import { AuthContext } from '../App';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const Register = () => {
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
      const response = await axios.post('/auth/register', values);
      const { token, ...userData } = response.data;
      login(userData, token);
      navigate('/', { replace: true });
    } catch (err) {
      console.error(err);
      setErrorMsg(
        err.response?.data?.message || 'Failed to register. Please check your network and try again.'
      );
    } finally {
      setLoading(false);
    }
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
          Create Account
        </Title>
        <Paragraph style={{ color: '#94a3b8', textAlign: 'center', marginBottom: '24px' }}>
          Sign up to begin operations case tracking
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
          name="register_form"
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="fullName"
            rules={[
              { required: true, message: 'Please enter your full name' },
              { whitespace: true, message: 'Name cannot be blank' },
            ]}
          >
            <Input
              prefix={<IdcardOutlined style={{ color: '#64748b' }} />}
              placeholder="Full Name"
              style={{
                background: 'rgba(15, 23, 42, 0.5)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#f8fafc',
              }}
            />
          </Form.Item>

          <Form.Item
            name="username"
            rules={[
              { required: true, message: 'Please enter a username' },
              { whitespace: true, message: 'Username cannot be blank' },
              { min: 3, message: 'Username must be at least 3 characters' }
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
            rules={[
              { required: true, message: 'Please enter a password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
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

          <Form.Item
            name="role"
            label={<Text style={{ color: '#cbd5e1', fontSize: '13px' }}>Select Role</Text>}
            initialValue="Agent"
            rules={[{ required: true, message: 'Please select a role' }]}
          >
            <Select
              placeholder="Select Role"
              dropdownStyle={{ background: '#1e293b' }}
              style={{ width: '100%' }}
            >
              <Option value="Manager">Manager (Creates & Approves)</Option>
              <Option value="Agent">Agent (Uploads & Submits)</Option>
            </Select>
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
              Sign Up
            </Button>
          </Form.Item>
        </Form>

        <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)', margin: '20px 0' }} />

        <div style={{ textAlign: 'center' }}>
          <Text style={{ color: '#94a3b8' }}>Already have an account? </Text>
          <Link to="/login" style={{ color: '#818cf8', fontWeight: 600 }}>
            Log In
          </Link>
        </div>
      </Card>
    </div>
  );
};

export default Register;
