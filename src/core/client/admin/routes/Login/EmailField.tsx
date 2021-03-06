import { Localized } from "fluent-react/compat";
import React, { FunctionComponent } from "react";
import { Field } from "react-final-form";

import { colorFromMeta, ValidationMessage } from "coral-framework/lib/form";
import {
  composeValidators,
  required,
  validateEmail,
} from "coral-framework/lib/validation";
import { FormField, InputLabel, TextField } from "coral-ui/components";

interface Props {
  disabled: boolean;
}

const EmailField: FunctionComponent<Props> = props => (
  <Field name="email" validate={composeValidators(required, validateEmail)}>
    {({ input, meta }) => (
      <FormField>
        <Localized id="login-emailAddressLabel">
          <InputLabel htmlFor={input.name}>Email Address</InputLabel>
        </Localized>
        <Localized
          id="login-emailAddressTextField"
          attrs={{ placeholder: true }}
        >
          <TextField
            id={input.name}
            placeholder="Email Address"
            color={colorFromMeta(meta)}
            disabled={props.disabled}
            fullWidth
            {...input}
          />
        </Localized>
        <ValidationMessage meta={meta} fullWidth />
      </FormField>
    )}
  </Field>
);

export default EmailField;
