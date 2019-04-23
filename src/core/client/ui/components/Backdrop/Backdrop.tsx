import cn from "classnames";
import React, { HTMLAttributes, StatelessComponent } from "react";

import { withStyles } from "talk-ui/hocs";

import styles from "./Backdrop.css";

interface Props extends HTMLAttributes<HTMLDivElement> {
  className?: string;
  /**
   * Override or extend the styles applied to the component.
   */
  classes: typeof styles;
  active?: boolean;
}

const Backdrop: StatelessComponent<Props> = ({
  classes,
  active,
  className,
  children,
  ...rest
}) => {
  const rootClassName = cn(
    classes.root,
    {
      [classes.active]: Boolean(active),
    },
    className
  );
  return <div className={rootClassName} {...rest} />;
};

const enhanced = withStyles(styles)(Backdrop);
export default enhanced;