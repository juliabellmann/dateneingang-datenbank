// components/Layout.js
import styled from 'styled-components';
import Navi from './Navi';
import Footer from './Footer';


export default function Layout({ children }) {
 return (
    <>
      <Navi />
        <Content>{children}</Content>
      <Footer />
    </>
  );
}


const Content = styled.div`
  width: 100%;
  padding: 0 0 5rem 0;
`;