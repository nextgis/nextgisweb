from ..command import Command


@Command.registry.register
class CleanUpCommand():
    identity = 'file_storage.cleanup'

    @classmethod
    def argparser_setup(cls, parser, env):
        dry_run_grp = parser.add_mutually_exclusive_group()
        dry_run_grp.add_argument(
            '--dry-run', action='store_true', default=True,
            help="Don't make any changes (default)")
        dry_run_grp.add_argument(
            '--no-dry-run', dest='dry_run', action='store_false',
            help="Make changes")

        unreferenced_grp = parser.add_mutually_exclusive_group()
        unreferenced_grp.add_argument(
            '--unreferenced', action='store_true', default=False,
            help="Delete unreferenced files")
        unreferenced_grp.add_argument(
            '--no-unreferenced', dest='unreferenced', action='store_false',
            help="Don't delete unreferenced files (default)")

        orphaned_grp = parser.add_mutually_exclusive_group()
        orphaned_grp.add_argument(
            '--orphaned', action='store_true', default=True,
            help="Delete orphaned files (default)")
        orphaned_grp.add_argument(
            '--no-orphaned', dest='orphaned', action='store_false',
            help="Don't delete orphaned files")

    @classmethod
    def execute(cls, args, env):
        env.file_storage.cleanup(
            dry_run=args.dry_run,
            unreferenced=args.unreferenced,
            orphaned=args.orphaned)

        if args.dry_run:
            print("Use --no-dry-run option to make the changes!")
