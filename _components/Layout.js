// components/Layout.js
import styled from 'styled-components';
import Navi from './Navi';
import Footer from './Footer';

export default function Layout({ children }) {
  return (
    <>
      <Navi />
      <Main>{children}</Main>
      <Footer />
    </>
  );
}

const Main = styled.main`
  flex: 1;
  padding-bottom: 8rem;
`;