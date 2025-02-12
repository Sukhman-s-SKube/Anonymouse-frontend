import styled from "styled-components";

export const Wrapper = styled.div`
    position: absolute;
    top: 0;
    left: ${({ $isOpen }) => ($isOpen ? '0' : '-100%')};
    z-index: 10;
    width: 90%;
    height: 100%;
    max-width: 20rem;
    background-color: #008235;
    padding: 1.25rem;
    justify-content: center;
    align-items: center;
    color: ${({ theme }) => theme.newChatText};
    font-size: 20px;
    transition: left 0.5s ease-in-out;
`;