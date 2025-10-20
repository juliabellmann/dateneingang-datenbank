import styled from 'styled-components';

export default function Footer() {
  return (
      <StyledFooter>
        <p>Copyright @ BKI</p>
      </StyledFooter>
  );
}

const StyledFooter = styled.footer`
  background: var(--primary-color);
  color: white;

  margin-top: 4rem;
  padding: 1rem;

  display: flex;
  justify-content: space-evenly;
  align-items: center;
  position: fixed;

  bottom: 0;
  right: 0;
  left: 0;
  z-index: 10;

  height: 50px;
`;