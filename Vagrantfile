# -*- mode: ruby -*-
VAGRANTFILE_API_VERSION = "2"

Vagrant.configure(VAGRANTFILE_API_VERSION) do |config|
    config.vm.box = "hashicorp/precise32"

    config.ssh.shell = "bash -c 'BASH_ENV=/etc/profile exec bash'"

    config.vm.provision :shell do |shell|
        shell.inline = "
            echo 'set grub-pc/install_devices /dev/sda' | debconf-communicate > /dev/null
            apt-get update -qq -y && apt-get upgrade -qq -y > /dev/null 
            dpkg -s python-software-properties > /dev/null 2>&1 || apt-get install -qq -y python-software-properties
            [ -f /etc/apt/sources.list.d/ubuntugis-ppa-*.list ] || apt-add-repository --yes ppa:ubuntugis/ppa && apt-get update -qq

            mkdir -p /etc/puppet/modules
            [ -d /etc/puppet/modules/postgresql ] || puppet module install puppetlabs-postgresql
        "
    end


    config.vm.provision :puppet do |puppet|
        puppet.manifests_path = "."
        puppet.manifest_file  = "vagrant.pp"
        puppet.module_path = [
            'puppet',
        ]
    end

    config.vm.network "forwarded_port", guest: 5000, host: 5000

end