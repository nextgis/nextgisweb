from humanize import naturalsize


def format_size(value):
    return naturalsize(value, binary=True, format="%.0f")
