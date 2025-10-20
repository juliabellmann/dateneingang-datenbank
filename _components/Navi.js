import Image from 'next/image';
import Link from 'next/link';
import styled from 'styled-components';

export default function Navi() {
  return (
      <StyledNavigation>
        <Image src="/logo_blue.svg" alt="Logo" width={155} height={58}></Image>
        <StyledNavLink href="https://www.bki.de">Homepage</StyledNavLink>

      </StyledNavigation>
  );
}

const StyledNavigation = styled.nav`
  padding: 4rem 15rem;

  display: flex;
  align-items: center;
  justify-content: space-between;
`;


const StyledNavLink = styled(Link)`
  color: #000;
  font-weight:400;

  &:hover {
    border-bottom: 3px solid #b5a286;
    /* text-decoration: underline; */
  }
`;