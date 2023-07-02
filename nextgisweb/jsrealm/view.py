from pathlib import Path


def setup_pyramid(comp, config):
    dist_path = Path(comp.options['dist_path'])
    for p in filter(lambda p: p.is_dir(), dist_path.iterdir()):
        pn = p.name
        if pn == 'external':
            for sp in filter(lambda p: p.is_dir(), p.iterdir()):
                config.add_static_path(sp.name, sp)
        else:
            config.add_static_path(pn, p)
