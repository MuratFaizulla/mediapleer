import React, { FC } from "react"
import Alert, { AlertProps } from "./Alert"

const NoScriptAlert: FC<AlertProps> = ({ className = "", canClose = true }) => {
  return (
    <Alert className={className} canClose={canClose}>
      Ну... похоже, вы отключили JavaScript.
    </Alert>
  )
}

export default NoScriptAlert
