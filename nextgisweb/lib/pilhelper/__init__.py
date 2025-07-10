def heif_init():
    if not getattr(heif_init, "_done", False):
        from pillow_heif import register_heif_opener

        register_heif_opener()
        setattr(heif_init, "_done", True)
