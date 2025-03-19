import styled from "styled-components";

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