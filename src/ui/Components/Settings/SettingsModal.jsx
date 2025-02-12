// SettingsModal.jsx
import React from 'react';
import styled, { useTheme } from 'styled-components';

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

export const SettingsModal = ({ onClose, darkMode, toggleDarkMode }) => {
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
      </ModalContent>
    </ModalOverlay>
  );
};
