export const TryError = (message, status = 500) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

export const CatchError = (err, res, prodMessage = "Internal server error") => {
  const status =
    err?.status ||
    (["ValidationError", "CastError", "StrictModeError"].includes(err?.name)
      ? 400
      : err?.code === 11000
        ? 409
        : /Mongo|Mongoose/.test(err?.name || "")
          ? 503
          : 500);
  const message = status < 500 && err?.status ? err.message : prodMessage;
  return res.status(status).json({ message });
};
