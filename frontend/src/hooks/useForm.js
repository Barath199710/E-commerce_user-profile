import { useState } from 'react';

/**
 * Custom hook to handle form state, change events, field errors, and resets.
 */
export const useForm = (initialValues = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});

  const handleChange = (e) => {
    const { name, value } = e.target;
    setValues((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear field-specific error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({
        ...prev,
        [name]: null,
      }));
    }
  };

  const setFieldError = (name, errorMessage) => {
    setErrors((prev) => ({
      ...prev,
      [name]: errorMessage,
    }));
  };

  const clearErrors = () => setErrors({});

  const resetForm = (newValues = initialValues) => {
    setValues(newValues);
    setErrors({});
  };

  return {
    values,
    errors,
    setValues,
    setErrors,
    handleChange,
    setFieldError,
    clearErrors,
    resetForm,
  };
};
