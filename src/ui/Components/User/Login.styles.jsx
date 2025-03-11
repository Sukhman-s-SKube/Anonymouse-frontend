import styled, { keyframes } from "styled-components";

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

export const LoadingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.7); 
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

export const Spinner = styled.div`
  border: 4px solid rgba(0, 0, 0, 0.1);
  border-top: 4px solid #3498db; /* blue color */
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: ${spin} 1s linear infinite;
`;

export const ToggleContainer = styled.div`
    display: flex; 
    position: relative; 
    height: 100%; 
    width: 100%; 
    margin: 20px auto;
    border-radius: 10px;
`

export const ToggleBtn = styled.button`
    width: 100%;
    position: relative;
    padding: 0;
    line-height: 22px;
    text-decoration: none;
    margin: 10px;
    color: ${({ $isLoginToggled }) => ($isLoginToggled ? 'white' : 'rgb(143, 143, 143)')};
    background-color: transparent;
    transition: 0.5s;
`

export const ToggleBtnBg = styled.div`
    background-color: #28a745;
    width: 153px;
    height: 100%;
    position: absolute;
    top: 0;
    margin-left: ${({ $isLoginToggled }) => ($isLoginToggled ? '' : '150px')};;
    /* z-index: -1; */
    transition: 0.5s;
    border-radius: 10px;
`