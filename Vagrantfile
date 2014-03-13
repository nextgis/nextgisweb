# -*- mode: ruby -*-
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
    config.ssh.shell = "bash -c 'BASH_ENV=/etc/profile exec bash'"

    config.vm.provision :shell do |shell|
        shell.inline = "
            echo 'set grub-pc/install_devices /dev/sda' | debconf-communicate > /dev/null
            apt-get update -qq -y && apt-get upgrade -qq -y > /dev/null 
            dpkg -s python-software-properties > /dev/null 2>&1 || apt-get install -qq -y python-software-properties
            [ -f /etc/apt/sources.list.d/ubuntugis-ppa-*.list ] || apt-add-repository --yes ppa:ubuntugis/ppa && apt-get update -qq

            mkdir -p /etc/puppet/modules
            [ -d /etc/puppet/modules/apt ] || puppet module install puppetlabs/apt
            [ -d /etc/puppet/modules/python ] || puppet module install stankevich-python
            [ -d /etc/puppet/modules/postgresql ] || puppet module install puppetlabs-postgresql
        "
    end

    config.vm.box = "hashicorp/precise64"

    config.vm.provision :puppet do |puppet|
        puppet.manifests_path = "."
        puppet.manifest_file  = "vagrant.pp"
        puppet.module_path = [
            'puppet',
        ]
    end

end