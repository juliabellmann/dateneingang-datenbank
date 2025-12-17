import { useEffect, useRef, useState } from "react";
import styled from "styled-components";

export default function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  //   // Klick außerhalb schließt Tooltip
  //   useEffect(() => {
  //     const handleClickOutside = (event) => {
  //       if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
  //         setOpen(false);
  //       }
  //     };

  //     document.addEventListener("mousedown", handleClickOutside);
  //     return () => document.removeEventListener("mousedown", handleClickOutside);
  //   }, []);

  // ESC schließt Tooltip
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  return (
    <Wrapper ref={wrapperRef}>
      {/* <Icon
        role="button"
        tabIndex={0}
        aria-label="Informationen anzeigen"
        onClick={() => setOpen((prev) => !prev)}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") && setOpen((prev) => !prev)
        }
      >
        i
      </Icon> */}
      <Icon
        role="button"
        tabIndex={0}
        aria-expanded={open}
        aria-label="Informationen anzeigen"
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
      >
        i
      </Icon>

      {/* {open && <Tooltip>{text}</Tooltip>} */}
      {open && (
        <Tooltip>
          <TooltipIcon>i</TooltipIcon>

          <CloseButton
            type="button"
            aria-label="Tooltip schließen"
            onClick={() => setOpen(false)}
          >
            ✕
          </CloseButton>

          <TooltipText>{text}</TooltipText>
        </Tooltip>
      )}
    </Wrapper>
  );
}

/* ===== Styled Components ===== */

const Wrapper = styled.span`
  position: relative;
  display: inline-block;
  margin-left: 6px;
`;

const Icon = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #b5a286;
  color: white;
  font-size: 11px;
  font-weight: bold;
  cursor: pointer;
  user-select: none;
`;

const Tooltip = styled.div`
  position: absolute;
  top: 0;
  left: 22px;
  background-color: #333;
  color: white;
  padding: 14px 10px 14px 16px; /* rechts kleiner */
  border-radius: 4px;
  font-size: 13px;

  min-width: 320px;
  max-width: 520px;
  width: max-content;

  white-space: normal;
  word-break: break-word;

  z-index: 10;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.3);
`;

const TooltipIcon = styled.span`
  position: absolute;
  top: 8px;
  left: 8px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background-color: #b5a286;
  color: white;
  font-size: 11px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CloseButton = styled.button`
  position: absolute;
  top: 6px;
  right: 6px;
  background: none;
  border: none;
  color: white;
  font-size: 14px;
  cursor: pointer;
`;

const TooltipText = styled.div`
  padding-left: 26px;
  padding-right: 20px;
  line-height: 1.4;
`;
