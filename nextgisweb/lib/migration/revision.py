from datetime import datetime

REVID_LENGTH = 8
REVID_ZERO = '0' * REVID_LENGTH

EPOCH_START = datetime(2015, 1, 1)
EPOCH_END = datetime(2050, 1, 1)
EPOCH_DELTA = (EPOCH_END - EPOCH_START).total_seconds() / (16 ** REVID_LENGTH - 1)


def revid(date=None):
    if date is None:
        date = datetime.utcnow()

    if date < EPOCH_START or date > EPOCH_END:
        raise ValueError("Date must be between {} and {}".format(EPOCH_START, EPOCH_END))

    n = int((date - EPOCH_START).total_seconds() / EPOCH_DELTA) + 1
    return "{0:0{1}x}".format(n, REVID_LENGTH)
