import type { ReactNode } from "react";

interface Props {
  children: ReactNode;
}

const PostAlert = ({children}: Props) => {
  return (
    <div className="alert alert-primary alert-dismissible container-fluid d-flex justify-content-center align-items-center" role="alert">
      {children}
    </div>
  );
};

export default PostAlert;
