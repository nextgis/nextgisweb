# -*- coding: utf-8 -*-
from __future__ import unicode_literals, print_function, absolute_import
import os
from os.path import join as pthjoin
from datetime import datetime
from tempfile import NamedTemporaryFile


import transaction
from minio import Minio

from .. import geojson
from ..command import Command
from ..models import DBSession

from .backup import backup, restore


@Command.registry.register
class InitializeDBCmd():
    identity = 'initialize_db'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            '--drop', action="store_true", default=False,
            help=u"Удалить существующие объекты из БД")

    @classmethod
    def execute(cls, args, env):
        metadata = env.metadata()

        with transaction.manager:
            connection = DBSession.connection()

            if args.drop:
                metadata.drop_all(connection)

            metadata.create_all(connection)

            for comp in env.chain('initialize_db'):
                comp.initialize_db()

            # It's unclear why, but if transaction only
            # ran DDL operators, then it will not be saved
            # need to force with a cludge

            connection.execute("COMMIT")


@Command.registry.register
class BackupCommand(Command):
    identity = 'backup'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            '--upload', dest='upload', action='store_true',
            help="upload backup to remote storage using S3 protocol")

        parser.add_argument(
            '--upload-object', dest='upload_object', metavar='name')

        parser.add_argument(
            '--upload-bucket', dest='upload_bucket', metavar='name',
            default=env.core._backup_upload_bucket)

        parser.add_argument(
            '--upload-server', dest='upload_server', metavar='host:port',
            default=env.core._backup_upload_server)

        parser.add_argument(
            '--upload-access-key', dest='upload_access_key', metavar='key',
            default=env.core._backup_upload_access_key)

        parser.add_argument(
            '--upload-secret-key', dest='upload_secret_key', metavar='secret',
            default=env.core._backup_upload_secret_key)

        parser.add_argument(
            '--no-zip', dest='nozip', action='store_true',
            help='use directory instead of zip-file as backup format')

        settings = env.core.settings
        if 'backup.path' in settings:
            default_target = pthjoin(
                settings['backup.path'],
                datetime.today().strftime(settings['backup.filename']) +
                '.ngwbackup')
        else:
            default_target = None

        parser.add_argument(
            'target', type=str, metavar='path',
            default=default_target, nargs='?',
            help='backup destination path')

    @classmethod
    def execute(cls, args, env):
        target = args.target
        autoname = datetime.today().strftime(env.core._backup_filename)
        if target is None:
            if env.core._backup_path:
                target = pthjoin(env.core._backup_path, autoname)
            else:
                target = NamedTemporaryFile(delete=False).name
                os.unlink(target)

        upload_object = args.upload_object
        if upload_object is None:
            upload_object = autoname

        if args.nozip and args.upload:
            raise RuntimeError("Incompatible options: no-zip and upload")

        if args.upload and upload_object is None:
            raise RuntimeError("Upload object name required")

        env.core.logger.info("Running backup to %s", target)
        backup(env, target, nozip=args.nozip)

        if args.upload:
            env.core.logger.info(
                "Uploading backup to server=%s, bucket=%s, object=%s",
                args.upload_server, args.upload_bucket, upload_object)
            client = Minio(
                args.upload_server, secure=False,
                access_key=args.upload_access_key,
                secret_key=args.upload_secret_key)

            if args.upload_secret_key:
                if not client.bucket_exists(args.upload_bucket):
                    env.core.logger.info("Bucket not exist so creating new")
                    client.make_bucket(args.upload_bucket)

            client.fput_object(args.upload_bucket, upload_object, target)


@Command.registry.register
class RestoreCommand(Command):
    identity = 'restore'

    @classmethod
    def argparser_setup(cls, parser, env):
        parser.add_argument(
            'source', type=str, metavar='path',
            help=u"Исходный файл или директория с резервной копией для"
            + u" восстановления")

    @classmethod
    def execute(cls, args, env):
        restore(env, args.source)


@Command.registry.register
class StatisticsCommand(Command):
    identity = 'statistics'

    @classmethod
    def argparser_setup(cls, parser, env):
        pass

    @classmethod
    def execute(cls, args, env):
        result = dict()
        for comp in env._components.values():
            if hasattr(comp, 'query_stat'):
                result[comp.identity] = comp.query_stat()

        print(geojson.dumps(result, ensure_ascii=False, indent=2).encode('utf-8'))
