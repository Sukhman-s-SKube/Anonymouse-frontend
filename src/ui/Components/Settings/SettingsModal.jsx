import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

import { ModalOverlay,  ModalContent,  CloseButton,  OptionRow,  FormRow,  SubmitButton } from '@/Components/Settings/SettingsModal.styles';

export const SettingsModal = ({ onClose, darkMode, toggleDarkMode, apiroot }) => {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    
    setError("");
    setLoading(true);
    
    try {
      const response = await axios.post(
        `${apiroot}/user/change-password`,
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
      
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      //console.error(err);
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
