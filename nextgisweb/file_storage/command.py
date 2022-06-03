from ..command import Command


@Command.registry.register
class CleanUpCommand():
    identity = 'file_storage.cleanup'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument('--dry-run', action='store_true', default=True)
        parser.add_argument('--no-dry-run', dest='dry_run', action='store_false')

        parser.add_argument('--unreferenced', action='store_true', default=False)
        parser.add_argument('--no-unreferenced', dest='unreferenced', action='store_false')

        parser.add_argument('--orphaned', action='store_true', default=True)
        parser.add_argument('--no-orphaned', dest='orphaned', action='store_false')

    @classmethod
    def execute(cls, args, env):
        env.file_storage.cleanup(
            unreferenced=not args.dry_run and args.unreferenced,
            orphaned=not args.dry_run and args.orphaned)

        if args.dry_run:
            print("Use --no-dry-run option to make the changes!")
