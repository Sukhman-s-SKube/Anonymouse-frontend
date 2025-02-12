// SettingsModal.jsx
import React, { useState } from 'react';
import styled from 'styled-components';
import axios from 'axios';
import { toast } from 'sonner';

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0,0,0,0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background: ${({ theme }) => theme.modalBackground};
  padding: 20px;
  border-radius: 8px;
  position: relative;
  width: 400px;
  color: ${({ theme }) => theme.text};
`;

const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${({ theme }) => theme.text};
`;

const OptionRow = styled.div`
  margin-top: 20px;
`;

const FormRow = styled.div`
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  
  label {
    margin-bottom: 5px;
    font-size: 0.9rem;
  }
  
  input {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
  }
`;

const SubmitButton = styled.button`
  margin-top: 20px;
  padding: 10px;
  background: ${({ theme }) => theme.newChatBackground || "#008235"};
  color: ${({ theme }) => theme.newChatText || "#fff"};
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  
  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const SettingsModal = ({ onClose, darkMode, toggleDarkMode }) => {
  // State for password change inputs and error/loading feedback
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    // Validate the new passwords match
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      // Make an API call to update the password.
      // Adjust the URL and payload to match your backend's API.
      const response = await axios.post(
        '/api/user/change-password',
        {
          currentPassword,
          newPassword,
        },
        {
          headers: {
            Authorization: sessionStorage.getItem("JWT"),
          },
        }
      );
      
      toast.success("Password changed successfully.");
      
      // Optionally, clear the fields or close the modal
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      console.error(err);
      setError("Failed to change password. Please check your current password and try again.");
      toast.error("Failed to change password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalOverlay>
      <ModalContent>
        <CloseButton onClick={onClose}>×</CloseButton>
        <h2>Settings</h2>
        
        <OptionRow>
          <label>
            <input
              type="checkbox"
              checked={darkMode}
              onChange={toggleDarkMode}
            />
            &nbsp; Dark Mode
          </label>
        </OptionRow>
        
        <hr style={{ marginTop: '20px' }} />
        
        <h3 style={{ marginTop: '20px' }}>Change Password</h3>
        {error && <p style={{ color: 'red' }}>{error}</p>}
        
        <form onSubmit={handlePasswordChange}>
          <FormRow>
            <label>Current Password:</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </FormRow>
          
          <FormRow>
            <label>New Password:</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
            />
          </FormRow>
          
          <FormRow>
            <label>Confirm New Password:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </FormRow>
          
          <SubmitButton type="submit" disabled={loading}>
            {loading ? "Changing..." : "Change Password"}
          </SubmitButton>
        </form>
      </ModalContent>
    </ModalOverlay>
  );
};
