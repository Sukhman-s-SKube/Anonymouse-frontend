import styled from "styled-components";

export const ModalOverlay = styled.div`
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

export const ModalContent = styled.div`
  background: ${({ theme }) => theme.modalBackground};
  padding: 20px;
  border-radius: 8px;
  position: relative;
  width: 400px;
  color: ${({ theme }) => theme.text};
`;

export const CloseButton = styled.button`
  position: absolute;
  top: 10px;
  right: 10px;
  background: transparent;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: ${({ theme }) => theme.text};
`;

export const OptionRow = styled.div`
  margin-top: 20px;
`;

export const FormRow = styled.div`
  margin-top: 15px;
  display: flex;
  flex-direction: column;
  
  label {
    margin-bottom: 5px;
    font-size: 0.9rem;
    color: ${({ theme }) => theme.text};
  }
  
  input {
    padding: 8px;
    border: 1px solid #ccc;
    border-radius: 4px;
    background-color: ${({ theme }) => theme.inputBackground};
    color: ${({ theme }) => theme.inputText};
    &::placeholder {
      color: ${({ theme }) => theme.inputText};
    }
  }
`;

export const SubmitButton = styled.button`
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